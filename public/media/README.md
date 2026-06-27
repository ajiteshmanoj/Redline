# Higgsfield media drop zone

Generated media goes here. The app renders perfectly **without** these files
(it falls back to an animated grid + gradient), so you can drop them in later
without touching code.

| File                       | Used by                         | Notes                                  |
| -------------------------- | ------------------------------- | -------------------------------------- |
| `hero.mp4`                 | Landing hero background         | Dark, slow, abstract. Muted, loops.    |
| `hero-poster.jpg`          | Hero poster / fallback frame    | First frame of `hero.mp4`.             |
| `console-ambient.mp4`      | (optional) console backdrop     | Subtle; keep it quiet behind the feed. |

Recommended: 1920×1080, H.264 `.mp4`, < 6 MB, seamless loop.

## Wiring them up

The slot lives in `components/higgsfield-video.tsx`. To activate the hero video,
pass the paths in `app/page.tsx`:

```tsx
<HiggsfieldVideo src="/media/hero.mp4" poster="/media/hero-poster.jpg" />
```

Search the codebase for `HIGGSFIELD ASSET SLOT` to find every drop point.
