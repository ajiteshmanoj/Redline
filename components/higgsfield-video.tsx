import { cn } from "@/lib/utils";

// ===========================================================================
// HIGGSFIELD ASSET SLOT
// ---------------------------------------------------------------------------
// Drop your generated media here. Nothing about the app's functionality
// depends on these files existing — if they're absent, the poster gradient
// and grid render instead, so the demo never breaks.
//
//   Hero background video  ->  /public/media/hero.mp4   (+ /public/media/hero-poster.jpg)
//   Console ambient loop   ->  /public/media/console-ambient.mp4
//
// Recommended: dark, slow, abstract motion (data streams, scanlines, red
// filament). 1920x1080, H.264 .mp4, muted, seamless loop, < 6 MB.
// ===========================================================================

type Props = {
  src?: string;
  poster?: string;
  className?: string;
  /** Lower the opacity for ambient/background use. */
  dim?: boolean;
};

export function HiggsfieldVideo({ src, poster, className, dim }: Props) {
  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)} aria-hidden>
      {/* Poster / fallback gradient — always present so layout never depends on media */}
      <div
        className="absolute inset-0 bg-grid bg-grid-fade"
        style={
          poster
            ? { backgroundImage: `url(${poster})`, backgroundSize: "cover", backgroundPosition: "center" }
            : undefined
        }
      />
      {/* The video itself only renders when a src is provided. */}
      {src ? (
        <video
          className={cn("absolute inset-0 h-full w-full object-cover", dim ? "opacity-30" : "opacity-60")}
          autoPlay
          loop
          muted
          playsInline
          poster={poster}
        >
          {/* HIGGSFIELD ASSET SLOT — primary source */}
          <source src={src} type="video/mp4" />
        </video>
      ) : null}
      {/* Cinematic vignette so text stays readable over any asset */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/30 via-ink/60 to-ink" />
    </div>
  );
}
