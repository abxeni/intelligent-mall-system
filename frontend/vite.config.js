import process from "node:process";
import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      "/api/pricing": {
        target: process.env.PRICING_API_TARGET || "http://127.0.0.1:8001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/pricing/, ""),
      },
      "/api/apriori": {
        target: process.env.APRIORI_API_TARGET || "http://127.0.0.1:8002",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/apriori/, ""),
      },
      "/api/recommender": {
        target: process.env.RECOMMENDER_API_TARGET || "http://127.0.0.1:8003",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/recommender/, ""),
      },
    },
  },
});
