import type { Metadata } from "next";
import { Fraunces, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { GuidedTour } from "@/components/tour/guided-tour";

// Editorial serif for display headings (the elegant, supcareer-style voice).
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  style: ["normal", "italic"],
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Redline — Red-team your AI agents before they ship",
  description:
    "Redline points an adversarial agent at your customer-facing chatbot, runs a full battery of attacks, and shows you exactly where it breaks — with proof, a severity score, and a fix.",
  metadataBase: new URL("https://redline.local"),
  openGraph: {
    title: "Redline — Red-team your AI agents before they ship",
    description:
      "Find out where your AI agent breaks before your customers — or your lawyers — do.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body className="min-h-screen antialiased">
        {children}
        <GuidedTour />
      </body>
    </html>
  );
}
