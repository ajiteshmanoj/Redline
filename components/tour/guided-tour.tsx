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

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playingRef = useRef(true);
  const mutedRef = useRef(false);
  const step = steps[index];

  // ---- activation ----
  const start = useCallback(() => {
    setIndex(0);
    setPlaying(true);
    playingRef.current = true;
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
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onended = null;
      audioRef.current.onerror = null;
      audioRef.current = null;
    }
  }, []);

  const stop = useCallback(() => {
    clearTimers();
    setActive(false);
  }, [clearTimers]);

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
    setRect(null);

    (async () => {
      // 1. ensure we're on the right route
      if (step.route && pathname !== step.route) router.push(step.route);

      // 2. wait for the target element to exist
      const el = await waitForElement(targetSelector(step.target), 9000, () => cancelled);
      if (cancelled) return;

      // 3. enter-action (e.g. reveal a tab we're about to narrate)
      if (step.action?.type === "click" && (step.action.when ?? "enter") === "enter") {
        clickTarget(step.action.target);
        await delay(180);
      }
      if (cancelled) return;

      // 4. scroll into view + position the spotlight (twice, to catch the settle)
      (el ?? document.querySelector(targetSelector(step.target)))?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
      positionToTarget();
      setTimeout(() => !cancelled && positionToTarget(), 650);

      // 5. narrate — audio if a clip exists, else a timed hold
      const armFallback = () => {
        holdTimer.current = setTimeout(doAdvance, step.holdMs ?? fallbackHoldMs(step.say));
      };
      if (mutedRef.current) {
        armFallback();
      } else {
        const audio = new Audio(`${AUDIO_BASE}/${step.id}.mp3`);
        audioRef.current = audio;
        audio.onended = doAdvance;
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

      {/* Spotlight: a transparent rect with a huge dim shadow = a "hole". */}
      {rect ? (
        <motion.div
          className="pointer-events-none absolute rounded-xl"
          initial={false}
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          transition={{ type: "spring", stiffness: 220, damping: 30 }}
          style={{ boxShadow: "0 0 0 9999px rgba(23,18,15,0.62)", outline: "1.5px solid rgba(194,14,46,0.85)", outlineOffset: 2 }}
        />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[rgba(23,18,15,0.62)]" />
      )}

      {/* Faux cursor. */}
      <motion.div
        className="pointer-events-none absolute z-[82]"
        initial={false}
        animate={{ x: cursor.x, y: cursor.y }}
        transition={{ type: "spring", stiffness: 200, damping: 26 }}
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
