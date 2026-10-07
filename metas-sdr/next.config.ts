import type { NextConfig } from "next";

const nextConfig = {
  // Não gerar AGENTS.md automaticamente ao rodar `next dev`.
  agentRules: false,
  devIndicators: false,
} as NextConfig;

export default nextConfig;
