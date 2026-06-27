"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, RotateCcw, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import {
  TOUR_STEPS,
  fallbackHoldMs,
  targetSelector,
  type TourStep,
} from "@/lib/tour/script";
import { Logomark } from "@/components/brand";

// At the tail of the closing narration ("…That's Redline."), reveal a full-screen
// brand splash. This much lead time (s) before the clip ends lands it on the line.
const FLASH_LEAD_S = 2.3;
// How long the splash lingers after the narration finishes, before the tour ends.
const FLASH_LINGER_MS = 1800;

type Rect = { top: number; left: number; width: number; height: number };

const AUDIO_BASE = "/tour";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Poll for a selector until it appears or the timeout elapses. */
function waitForElement(
  selector: string,
  timeoutMs: number,
  cancelled: () => boolean,
): Promise<Element | null> {
  return new Promise((resolve) => {
    const start = Date.now();
    const tick = () => {
      if (cancelled()) return resolve(null);
      const el = document.querySelector(selector);
      if (el) return resolve(el);
      if (Date.now() - start > timeoutMs) return resolve(null);
      setTimeout(tick, 120);
    };
    tick();
  });
}

/**
 * Self-driving guided demo. Activated by ?tour=1 on load, or a `redline:tour`
 * window event (the hero button). Moves a spotlight + cursor across the page,
 * navigates between routes, scrolls each target into view, plays the matching
 * ElevenLabs clip (falling back to a timed hold when audio is absent), shows
 * subtitles, and auto-advances. Built to be screen-recorded.
 */
export function GuidedTour({ steps = TOUR_STEPS }: { steps?: TourStep[] }) {
  const router = useRouter();
  const pathname = usePathname();

  const [active, setActive] = useState(false);
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [flash, setFlash] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const endTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(true);
  const mutedRef = useRef(false);
  const step = steps[index];

  // ---- activation ----
  const start = useCallback(() => {
    setIndex(0);
    setPlaying(true);
    playingRef.current = true;
    setFlash(false);
    setActive(true);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (new URLSearchParams(window.location.search).get("tour") === "1") start();
    const onEvent = () => start();
    window.addEventListener("redline:tour", onEvent);
    return () => window.removeEventListener("redline:tour", onEvent);
  }, [start]);

  const clearTimers = useCallback(() => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
    holdTimer.current = null;
    if (endTimer.current) clearTimeout(endTimer.current);
    endTimer.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current.ontimeupdate = null;
      audioRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setFlash(false);
    setActive(false);
  }, [clearTimers]);

  // The closing step ends on the brand splash: keep it on screen for a beat,
  // fade it, then end the tour. (Used in place of doAdvance for that step.)
  const finishWithFlash = useCallback(() => {
    setFlash(true);
    endTimer.current = setTimeout(() => {
      setFlash(false);
      endTimer.current = setTimeout(() => stop(), 480);
    }, FLASH_LINGER_MS);
  }, [stop]);

  const clickTarget = useCallback((sel: string) => {
    const t = document.querySelector(targetSelector(sel));
    (t as HTMLElement | null)?.click();
  }, []);

  const positionToTarget = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(targetSelector(step.target));
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    const pad = 8;
    setRect({ top: r.top - pad, left: r.left - pad, width: r.width + pad * 2, height: r.height + pad * 2 });
  }, [step]);

  const next = useCallback(() => {
    setIndex((i) => {
      if (i >= steps.length - 1) {
        clearTimers();
        setActive(false);
        return i;
      }
      return i + 1;
    });
  }, [steps.length, clearTimers]);

  // Fire any exit-action, then advance.
  const doAdvance = useCallback(() => {
    if (!playingRef.current) return;
    if (step?.action?.type === "click" && step.action.when === "exit") {
      clickTarget(step.action.target);
    }
    next();
  }, [step, clickTarget, next]);

  // ---- main step runner (route → wait → action → scroll → narrate) ----
  useEffect(() => {
    if (!active || !step) return;
    let cancelled = false;
    clearTimers();
    // Keep the previous spotlight visible during navigation/wait — smoother.

    (async () => {
      // 1. ensure we're on the right route
      if (step.route && pathname !== step.route) router.push(step.route);

      // 2. wait for the target element to exist (long for live runs)
      const el = await waitForElement(targetSelector(step.target), step.waitMs ?? 9000, () => cancelled);
      if (cancelled) return;

      // 3. enter-action (e.g. reveal a tab we're about to narrate)
      if (step.action?.type === "click" && (step.action.when ?? "enter") === "enter") {
        clickTarget(step.action.target);
        await delay(120);
      }
      if (cancelled) return;

      // 4. scroll into view + position the spotlight (twice, to catch the settle)
      (el ?? document.querySelector(targetSelector(step.target)))?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      positionToTarget();
      setTimeout(() => !cancelled && positionToTarget(), 380);

      // 5. narrate — audio if a clip exists, else a timed hold. The final step
      //    ends on a full-screen brand splash timed to "…That's Redline."
      const isClosing = step.id === "closing";
      const onDone = isClosing ? finishWithFlash : doAdvance;

      const armFallback = () => {
        const total = step.holdMs ?? fallbackHoldMs(step.say);
        // No audio: reveal the splash near the tail of the (silent) hold.
        const wait = isClosing ? Math.max(400, total - FLASH_LEAD_S * 1000) : total;
        holdTimer.current = setTimeout(onDone, wait);
      };
      if (mutedRef.current) {
        armFallback();
      } else {
        const audio = new Audio(`${AUDIO_BASE}/${step.id}.mp3`);
        audioRef.current = audio;
        if (isClosing) {
          // Reveal the splash a beat before the clip ends — on the closing line.
          audio.ontimeupdate = () => {
            if (audio.duration && audio.duration - audio.currentTime <= FLASH_LEAD_S) {
              setFlash(true);
              audio.ontimeupdate = null;
            }
          };
        }
        audio.onended = onDone;
        audio.onerror = armFallback; // clip not generated yet → timed hold
        audio.play().catch(armFallback); // autoplay blocked → timed hold
      }
    })();

    return () => {
      cancelled = true;
      clearTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, index]);

  // Track the target while scrolling / resizing.
  useEffect(() => {
    if (!active) return;
    let raf = 0;
    const onMove = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(positionToTarget);
    };
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [active, positionToTarget]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => {
      const np = !p;
      playingRef.current = np;
      if (!np) {
        if (holdTimer.current) clearTimeout(holdTimer.current);
        audioRef.current?.pause();
      } else if (audioRef.current?.paused) {
        audioRef.current.play().catch(() => {});
      } else if (!audioRef.current && step) {
        holdTimer.current = setTimeout(doAdvance, step.holdMs ?? fallbackHoldMs(step.say));
      }
      return np;
    });
  }, [doAdvance, step]);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      mutedRef.current = !m;
      return !m;
    });
  }, []);

  if (!active || !step) return null;

  const cursor = rect
    ? { x: rect.left + Math.min(40, rect.width * 0.3), y: rect.top + Math.min(40, rect.height * 0.4) }
    : { x: -100, y: -100 };

  return (
    <div className="fixed inset-0 z-[80]">
      {/* Click-blocker so the page isn't interactable mid-tour. */}
      <div className="absolute inset-0" />

      {/* Closing brand splash — fills the screen on "…That's Redline." */}
      <AnimatePresence>
        {flash ? (
          <motion.div
            key="brand-flash"
            className="absolute inset-0 z-[88] flex flex-col items-center justify-center bg-night text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* faint red glow behind the mark */}
            <div className="pointer-events-none absolute h-[60vmin] w-[60vmin] rounded-full bg-redline/20 blur-[120px]" />
            <motion.div
              className="relative flex flex-col items-center"
              initial={{ scale: 0.82, opacity: 0, y: 14 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
            >
              <Logomark className="h-28 w-28 drop-shadow-[0_10px_44px_rgba(194,14,46,0.55)] sm:h-36 sm:w-36" />
              <span className="mt-6 font-display text-7xl font-semibold tracking-tight text-[#F7F4EE] sm:text-8xl">
                Redline
              </span>
              <motion.span
                className="mt-5 block h-[3px] w-44 origin-center bg-redline"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.22, duration: 0.5, ease: "easeOut" }}
              />
              <span className="mt-6 text-xs uppercase tracking-[0.32em] text-white/55 sm:text-sm">
                The safety layer for AI agents
              </span>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* Spotlight: a transparent rect with a huge dim shadow = a "hole". */}
      {rect ? (
        <motion.div
          className="pointer-events-none absolute rounded-xl"
          initial={false}
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          transition={{ type: "spring", stiffness: 300, damping: 28 }}
          style={{ boxShadow: "0 0 0 9999px rgba(28,24,18,0.40)", outline: "2px solid rgba(194,14,46,0.9)", outlineOffset: 3 }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[rgba(28,24,18,0.40)]" />
      )}

      {/* Faux cursor. */}
      <motion.div
        className="pointer-events-none absolute z-[82]"
        initial={false}
        animate={{ x: cursor.x, y: cursor.y }}
        transition={{ type: "spring", stiffness: 280, damping: 26 }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.4)]">
          <path d="M3 2l16 7-6.5 2L9 18 3 2z" fill="#C20E2E" stroke="#fff" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </motion.div>

      {/* Subtitle. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-24 flex justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={step.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35 }}
            className="max-w-2xl rounded-xl border border-white/10 bg-[rgba(23,18,15,0.92)] px-5 py-3.5 text-center text-[15px] leading-relaxed text-white shadow-2xl backdrop-blur"
          >
            {step.say}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Controls. */}
      <div className="absolute inset-x-0 bottom-6 z-[83] flex justify-center px-4">
        <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-[rgba(23,18,15,0.92)] px-2 py-1.5 text-white shadow-2xl backdrop-blur">
          <CtrlBtn onClick={togglePlay} label={playing ? "Pause" : "Play"}>
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </CtrlBtn>
          <CtrlBtn onClick={doAdvance} label="Skip">
            <SkipForward className="h-4 w-4" />
          </CtrlBtn>
          <CtrlBtn onClick={toggleMute} label={muted ? "Unmute" : "Mute"}>
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </CtrlBtn>
          <CtrlBtn onClick={start} label="Restart">
            <RotateCcw className="h-4 w-4" />
          </CtrlBtn>
          <span className="px-2 font-mono text-[11px] tabular-nums text-white/60">
            {index + 1}/{steps.length}
          </span>
          <CtrlBtn onClick={stop} label="Close">
            <X className="h-4 w-4" />
          </CtrlBtn>
        </div>
      </div>
    </div>
  );
}

function CtrlBtn({
  onClick,
  label,
  children,
}: {
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </button>
  );
}
