import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Gera um servidor enxuto em .next/standalone, usado pela imagem Docker
  // (deploy/Dockerfile) para rodar na VPS.
  output: "standalone",
};

export default nextConfig;
