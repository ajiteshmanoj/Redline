// ===========================================================================
// scripts/gen-narration.mjs — pre-generate the guided-tour narration.
//
// Reads the narration lines straight out of lib/tour/script.ts (single source
// of truth), calls ElevenLabs text-to-speech once per line, and writes
// public/tour/<id>.mp3 plus a manifest. The guided tour then plays these static
// clips — so the ElevenLabs key never ships to the browser and playback is
// deterministic on stage.
//
// Usage:
//   1. Put ELEVENLABS_API_KEY=... in .env.local (optionally ELEVENLABS_VOICE_ID).
//   2. npm run tour:audio
//   3. Commit the generated public/tour/*.mp3 files.
// ===========================================================================

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT_DIR = resolve(ROOT, "public/tour");

// Default voice: ElevenLabs "Rachel" — calm, natural narration voice. Override
// with any specific library voice via ELEVENLABS_VOICE_ID.
const DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";
const MODEL_ID = "eleven_multilingual_v2";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(ROOT, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    /* no .env.local — rely on process env */
  }
}

// Pull { id, say } pairs out of lib/tour/script.ts without a TS loader.
function loadSteps() {
  const src = readFileSync(resolve(ROOT, "lib/tour/script.ts"), "utf8");
  const block = src.slice(src.indexOf("TOUR_STEPS"));
  const re = /id:\s*"([^"]+)"[\s\S]*?say:\s*"((?:[^"\\]|\\.)*)"/g;
  const steps = [];
  let m;
  while ((m = re.exec(block))) {
    steps.push({ id: m[1], say: m[2].replace(/\\"/g, '"') });
  }
  return steps;
}

async function tts(text, voiceId, apiKey) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "content-type": "application/json",
      accept: "audio/mpeg",
    },
    body: JSON.stringify({
      text,
      model_id: MODEL_ID,
      // Lower stability + a touch of style = more natural, less monotone.
      // speed slightly above 1 so delivery feels brisk, not sluggish.
      voice_settings: {
        stability: 0.32,
        similarity_boost: 0.75,
        style: 0.42,
        use_speaker_boost: true,
        speed: 1.08,
      },
    }),
  });
  if (!res.ok) {
    throw new Error(`ElevenLabs ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  loadEnvLocal();
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE;
  if (!apiKey) {
    console.error("✗ ELEVENLABS_API_KEY not set (add it to .env.local). Aborting.");
    process.exit(1);
  }

  const steps = loadSteps();
  if (!steps.length) {
    console.error("✗ No tour steps found in lib/tour/script.ts.");
    process.exit(1);
  }

  mkdirSync(OUT_DIR, { recursive: true });
  console.log(`▸ Generating ${steps.length} clips with voice ${voiceId}…`);

  const manifest = [];
  for (const step of steps) {
    process.stdout.write(`  • ${step.id} … `);
    const audio = await tts(step.say, voiceId, apiKey);
    writeFileSync(resolve(OUT_DIR, `${step.id}.mp3`), audio);
    manifest.push({ id: step.id, chars: step.say.length, bytes: audio.length });
    console.log(`${(audio.length / 1024).toFixed(0)} KB`);
  }

  writeFileSync(resolve(OUT_DIR, "manifest.json"), JSON.stringify({ voiceId, model: MODEL_ID, clips: manifest }, null, 2));
  console.log(`✓ Wrote ${steps.length} clips + manifest to public/tour/`);
}

main().catch((err) => {
  console.error("✗", err.message);
  process.exit(1);
});
