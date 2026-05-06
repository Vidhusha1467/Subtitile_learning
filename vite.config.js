import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  // ── Dev Server ──────────────────────────────────────────────
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Forward /api/* → http://localhost:3000/api/*
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        timeout: 15 * 60 * 1000,        // 15 min — large video transcription
        proxyTimeout: 15 * 60 * 1000,
      },
      // Forward /signup, /login, /products, /health → http://localhost:3000
      "/signup": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/login": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/forgot-password": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/products": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
      "/health": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
});

