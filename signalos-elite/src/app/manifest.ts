import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SigiOS Elite",
    short_name: "SigiOS",
    description: "Verified stock Pulse, your morning Sigi Briefing, and the companies you follow.",
    id: "/",
    start_url: "/pulse",
    scope: "/",
    display: "standalone",
    background_color: "#07111b",
    theme_color: "#07111b",
    icons: [
      {
        src: "/app-icon/192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/app-icon/512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
