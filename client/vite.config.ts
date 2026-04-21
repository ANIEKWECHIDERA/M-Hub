import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/ingest": {
        target: "https://us.i.posthog.com",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ingest/, ""),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("commonjsHelpers")) {
            return "vendor-react";
          }

          if (!id.includes("node_modules")) {
            return undefined;
          }

          if (
            id.includes("/react/") ||
            id.includes("/react-dom/") ||
            id.includes("/react-router-dom/") ||
            id.includes("/@remix-run/") ||
            id.includes("/scheduler/")
          ) {
            return "vendor-react";
          }

          if (id.includes("/firebase/") || id.includes("/@firebase/")) {
            return "vendor-firebase";
          }

          if (id.includes("/@supabase/")) {
            return "vendor-supabase";
          }

          if (id.includes("/posthog-js/")) {
            return "vendor-analytics";
          }

          if (id.includes("/framer-motion/") || id.includes("/motion-dom/")) {
            return "vendor-motion";
          }

          if (id.includes("/@radix-ui/")) {
            return "vendor-radix";
          }

          if (id.includes("/lucide-react/")) {
            return "vendor-icons";
          }

          if (
            id.includes("/@dnd-kit/") ||
            id.includes("/quill/") ||
            id.includes("/react-quill-new/")
          ) {
            return "vendor-feature";
          }

          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
