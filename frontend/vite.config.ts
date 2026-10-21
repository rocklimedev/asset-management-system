import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      // The app shows its own "update available" prompt (PwaPrompts),
      // so a new version is only activated when the user agrees.
      registerType: "prompt",

      // Registration is started by useRegisterSW in PwaPrompts, not injected.
      injectRegister: null,

      manifest: {
        name: "ITAM \u2014 IT Asset Management",
        short_name: "ITAM",
        description:
          "Track IT assets, inventory, systems, software licences and employees.",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "any",
        background_color: "#F5F7FA",
        theme_color: "#0F1729",
        categories: ["business", "productivity"],
        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
          {
            src: "/pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        // App shell: JS, CSS, HTML and static images are precached.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
        cleanupOutdatedCaches: true,

        // Client-side routes resolve to the cached shell when offline.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          {
            // Live data is never served from cache. The origin is written
            // out here (not referenced from a variable) because this function
            // is copied verbatim into the generated service worker.
            // Production API origin: see src/lib/api.ts.
            urlPattern: ({ url }) => url.origin === "https://asset-api.spsyndicate.net",
            handler: "NetworkOnly",
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\//,
            handler: "StaleWhileRevalidate",
            options: { cacheName: "google-fonts-css" },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-files",
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Service worker stays off in `vite dev` to avoid stale code while developing.
      devOptions: { enabled: false },
    }),
  ],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    port: 5173,

    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
