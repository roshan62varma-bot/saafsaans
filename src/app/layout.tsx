import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Fraunces, Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

// Atkinson Hyperlegible was designed by the Braille Institute for low-vision readers.
const body = Atkinson_Hyperlegible({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
const display = Fraunces({ variable: "--font-display-face", subsets: ["latin"], display: "swap" });
const deva = Noto_Sans_Devanagari({
  variable: "--font-deva",
  subsets: ["devanagari"],
  weight: ["400", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "SaafSaans — Smog-season air-quality assistant",
  description:
    "Live AQI, a personalised low-exposure routine, indoor air hacks and the measured impact of cleaner choices for families facing winter smog.",
  applicationName: "SaafSaans",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f4ee" },
    { media: "(prefers-color-scheme: dark)", color: "#0d1312" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${body.variable} ${display.variable} ${deva.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
