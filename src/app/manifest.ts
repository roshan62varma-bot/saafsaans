import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SaafSaans — Smog-season air-quality assistant",
    short_name: "SaafSaans",
    description:
      "Personalised low-exposure routines, indoor air hacks and cleaner choices for smog season.",
    start_url: "/",
    display: "standalone",
    background_color: "#f6f4ee",
    theme_color: "#0b625b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
