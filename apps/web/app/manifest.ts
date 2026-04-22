import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MPSTME Canteen Pay",
    short_name: "Canteen Pay",
    description: "Order ahead, pay fast, and collect smart.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#020617",
    theme_color: "#020617",
    icons: [
      {
        src: "/mpstme-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/mpstme-logo.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
