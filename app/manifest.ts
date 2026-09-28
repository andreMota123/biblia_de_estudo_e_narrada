import type { MetadataRoute } from "next";

// Permite instalar o app na tela inicial do celular/computador
// ("Adicionar à tela inicial"), abrindo em tela cheia como um app nativo.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Bíblia Origens",
    short_name: "Bíblia",
    description: "Leitura, narração e estudo da Bíblia com hebraico e grego.",
    lang: "pt-BR",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
