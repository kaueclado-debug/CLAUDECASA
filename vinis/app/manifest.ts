import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vinis, minha coleção de discos",
    short_name: "Vinis",
    description: "Catálogo da sua coleção de discos de vinil.",
    start_url: "/",
    display: "standalone",
    background_color: "#1a1512",
    theme_color: "#1a1512",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
