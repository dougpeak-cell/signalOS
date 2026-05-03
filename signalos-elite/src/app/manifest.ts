import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SigiOS Elite",
    short_name: "SigiOS",
    description: "SigiOS market intelligence and trading workspace.",
    start_url: "/",
    display: "standalone",
    background_color: "#07111b",
    theme_color: "#07111b",
    icons: [
      {
        src: "/icon",
        sizes: "32x32",
        type: "image/png",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  };
}
