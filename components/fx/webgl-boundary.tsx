"use client";

import { Component, type ReactNode } from "react";

// Catches any runtime error from the WebGL canvas (context loss, driver
// failure) and swaps in the CSS fallback instead of crashing the page.
export class WebGLBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  constructor(props: { children: ReactNode; fallback: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    // swallow — fallback already covers the UX
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/** Cheap runtime probe for a usable WebGL context. */
export function hasWebGL(): boolean {
  if (typeof document === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl") || canvas.getContext("experimental-webgl"))
    );
  } catch {
    return false;
  }
}
