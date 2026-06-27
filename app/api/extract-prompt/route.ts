import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ===========================================================================
// /api/extract-prompt — given a PUBLIC GitHub repo, find the agent's system
// prompt(s) in the source and return candidates for the user to confirm.
//
// You can't red-team static code — you have to run the bot. So Redline extracts
// the SYSTEM PROMPT (which is the bot, for most prompt-only bots) and audits
// that. This nails prompt-only bots; for tool-using agents it's a lower bound.
//
// Uses the unauthenticated GitHub API (public repos only, rate-limited). No
// build, no execution, no secrets — just reads text files.
// ===========================================================================

type Candidate = { path: string; prompt: string; score: number };

const MAX_TREE_FILES = 4000;
const MAX_FETCH = 20; // cap network reads per request
const MAX_FILE_BYTES = 200_000;

// Files worth opening, by extension.
const CODE_EXT = /\.(ts|tsx|js|jsx|py|md|mdx|txt|json|yaml|yml|toml|env\.example)$/i;
// Path hints that a file holds a prompt — weighted, strong signal first.
function pathScore(p: string): number {
  if (/(system[_-]?prompt|persona|instruction)/i.test(p)) return 3;
  if (/prompt/i.test(p)) return 3;
  if (/(agent|character)/i.test(p)) return 2;
  if (/(assistant|chatbot|\bbot\b|chat)/i.test(p)) return 1;
  return 0;
}
const PATH_HINT = /(prompt|system|persona|instruction|agent|character|assistant|bot|chat)/i;
// Content that looks like a system prompt.
const CONTENT_HINT = /(you are |you're |system prompt|act as |your role is|as an? (assistant|agent)|respond as)/i;

function parseRepo(input: string): { owner: string; repo: string } | null {
  const s = input.trim().replace(/\.git$/, "");
  const url = s.match(/github\.com[/:]([^/]+)\/([^/?#]+)/i);
  if (url) return { owner: url[1], repo: url[2] };
  const slug = s.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (slug) return { owner: slug[1], repo: slug[2] };
  return null;
}

const GH_HEADERS: Record<string, string> = {
  Accept: "application/vnd.github+json",
  "User-Agent": "redline-audit",
  ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
};

/** Pull the most prompt-like text out of a file's contents. */
function extractFromContent(path: string, text: string): Candidate | null {
  // 1) Quoted/backticked/triple-quoted string literals that look like prompts.
  const blocks: string[] = [];
  const stringLit = /(`([^`]{40,4000})`)|("((?:\\.|[^"\\]){60,4000})")|('((?:\\.|[^'\\]){60,4000})')|("""([\s\S]{40,4000}?)""")|('''([\s\S]{40,4000}?)''')/g;
  let m: RegExpExecArray | null;
  while ((m = stringLit.exec(text)) !== null) {
    const body = (m[2] ?? m[4] ?? m[6] ?? m[8] ?? m[10] ?? "").trim();
    if (body && CONTENT_HINT.test(body)) blocks.push(unescape(body));
  }
  // 2) Markdown / plain-text files: if the whole file reads like a prompt, use it.
  if (blocks.length === 0 && /\.(md|mdx|txt)$/i.test(path) && CONTENT_HINT.test(text)) {
    blocks.push(text.trim().slice(0, 4000));
  }
  if (blocks.length === 0) return null;
  // Prefer the longest prompt-looking block in the file.
  const best = blocks.sort((a, b) => b.length - a.length)[0];
  const score =
    best.length +
    (PATH_HINT.test(path) ? 2000 : 0) +
    (/system/i.test(text.slice(Math.max(0, text.indexOf(best) - 80), text.indexOf(best))) ? 1500 : 0);
  return { path, prompt: best, score };
}

function unescape(s: string): string {
  return s
    .replace(/\\n/g, "\n")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
}

export async function POST(req: NextRequest) {
  const { repo: repoInput } = (await req.json().catch(() => ({}))) as { repo?: string };
  const parsed = repoInput ? parseRepo(repoInput) : null;
  if (!parsed) {
    return Response.json({ ok: false, error: "Enter a public GitHub repo as owner/name or a github.com URL." });
  }
  const { owner, repo } = parsed;
  const slug = `${owner}/${repo}`;

  try {
    // Default branch.
    const metaRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers: GH_HEADERS });
    if (metaRes.status === 404) return Response.json({ ok: false, error: `Repo ${slug} not found (is it public?).` });
    if (metaRes.status === 403) return Response.json({ ok: false, error: "GitHub rate limit hit. Try again shortly, or paste the prompt directly." });
    if (!metaRes.ok) return Response.json({ ok: false, error: `GitHub error ${metaRes.status}.` });
    const meta = (await metaRes.json()) as { default_branch?: string };
    const branch = meta.default_branch || "main";

    // Recursive file tree.
    const treeRes = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`,
      { headers: GH_HEADERS },
    );
    if (!treeRes.ok) return Response.json({ ok: false, error: `Couldn't read the file tree (${treeRes.status}).` });
    const tree = (await treeRes.json()) as { tree?: { path: string; type: string; size?: number }[] };
    const files = (tree.tree ?? [])
      .filter((n) => n.type === "blob" && CODE_EXT.test(n.path) && (n.size ?? 0) < MAX_FILE_BYTES)
      .slice(0, MAX_TREE_FILES);

    // Rank by weighted path hint first, then fetch the top N and scan contents.
    const ranked = files
      .map((f) => ({ ...f, hint: pathScore(f.path) }))
      .sort((a, b) => b.hint - a.hint || (a.size ?? 0) - (b.size ?? 0))
      .slice(0, MAX_FETCH);

    const candidates: Candidate[] = [];
    for (const f of ranked) {
      const raw = await fetch(
        `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${f.path}`,
        { headers: { "User-Agent": "redline-audit" } },
      );
      if (!raw.ok) continue;
      const text = await raw.text();
      const c = extractFromContent(f.path, text);
      if (c) candidates.push(c);
    }

    candidates.sort((a, b) => b.score - a.score);
    const top = candidates.slice(0, 6).map(({ path, prompt }) => ({ path, prompt }));

    return Response.json({ ok: true, repo: slug, branch, scanned: ranked.length, candidates: top });
  } catch (err) {
    return Response.json({ ok: false, error: (err as Error).message });
  }
}
