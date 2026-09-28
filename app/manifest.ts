import type { MetadataRoute } from "next";

// Lets members install the LifeCharter Program on their phone's home screen like an app (lp043).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "The LifeCharter Program",
    short_name: "LifeCharter",
    description: "Your 13 weeks, your Charter and the Tuesday Gatherings, with AmiLynne “Babs” Carroll.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#fbf8f1",
    theme_color: "#0f5b63",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
