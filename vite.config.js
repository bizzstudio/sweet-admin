import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";
import { VitePWA } from "vite-plugin-pwa";
import compression from "vite-plugin-compression2";

import dns from "dns";
import path from "path";

dns.setDefaultResultOrder("verbatim");

export default defineConfig(({ mode }) => {
  // נטען מה-.env שיושב על השרת — לא נצרב בקוד.
  const env = loadEnv(mode, process.cwd(), "VITE_");

  // הנתיב שממנו האפליקציה מוגשת:
  //   "/"              — דומיין ייעודי (admin.example.com)
  //   "/sweet-admin/"  — תת-תיקייה (srv2.bizzstudio.co.il/sweet-admin/)
  // מנורמל כך שתמיד יתחיל ויסתיים ב-"/", גם אם נכתב ב-.env בלי.
  const rawBase = env.VITE_APP_BASE_PATH || "/";
  const base = `/${rawBase.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");

  return {
    // root: "./", // Set the root directory of your project

    base,

    build: {
    outDir: "dist", // Set the output directory for the build files
    assetsDir: "@/assets", // Set the directory for the static assets
    // sourcemap: process.env.__DEV__ === "true",
    rollupOptions: {
      // Additional Rollup configuration options if needed
    },
    chunkSizeWarningLimit: 10 * 1024,
  },
  plugins: [
    react(),
    cssInjectedByJsPlugin(),

    VitePWA({
      registerType: "autoUpdate",
      devOptions: {
        // enabled: process.env.SW_DEV === "true",
        enabled: false,
        /* when using generateSW the PWA plugin will switch to classic */
        type: "module",
        navigateFallback: "index.html",
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
        // ניתוב צד-לקוח: רענון בכתובת פנימית יוחזר ל-index.html.
        // זה מכסה רק ביקורים חוזרים (אחרי שה-SW נרשם) — עדיין חובה להגדיר
        // rewrite בצד השרת עבור הכניסה הראשונה.
        navigateFallback: `${base}index.html`,
        // לא לחטוף בקשות לאפליקציות אחרות שיושבות על אותו דומיין
        // (הבקאנד והחנות, כשהם בתת-תיקיות נפרדות).
        navigateFallbackDenylist: [/^\/[^/]+-backend\//, /^\/[^/]+-store\//],
      },
      // add this to cache all the
      // // static assets in the public folder
      // includeAssets: ["**/*"],
      includeAssets: [
        "**/*",
        "src/assets/img/logo/*.png",
        "src/assets/img/*.png",
        "src/assets/img/*.jepg",
        "src/assets/img/*.webp",
        "favicon.ico",
      ],
      // חייב להיות אובייקט, לא מערך. קודם זה הועבר כמערך ו-VitePWA עטף אותו
      // תחת המפתח "0" והתעלם ממנו — ה-manifest שנוצר בפועל הכיל ערכי ברירת מחדל.
      // הנתיבים יחסיים בכוונה, כדי שיעבדו מתוך תת-התיקייה.
      manifest: {
        theme_color: "#f69435",
        background_color: "#f69435",
        display: "standalone",
        orientation: "portrait",
        scope: "./",
        start_url: "./",
        id: "./",
        short_name: "המתוקים של בני",
        name: "המתוקים של בני - ניהול חנות",
        description: "המתוקים של בני - ניהול חנות וירטואלית",
        icons: [
          {
            src: "favicon.png",
            sizes: "48x48",
            type: "image/png",
          },
          {
            src: "logo192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "logo512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
    compression(),
  ],

    server: {
      proxy: {
        "/api/": {
          target: env.VITE_APP_API_BASE_URL,
          changeOrigin: true,
        },
      },
    },
    define: {
      // אין להזריק את process.env המלא — זה צורב את כל משתני הסביבה של מכונת
      // הבנייה (כולל סודות של ה-shell) לתוך ה-bundle שנשלח לדפדפן.
      // הקוד משתמש ב-import.meta.env בלבד; אובייקט ריק שומר על תאימות.
      "process.env": {},
      // global: {}, //enable this when running on dev/local mode
    },

    resolve: {
      alias: {
        // eslint-disable-next-line no-undef
        "@": path.resolve(__dirname, "./src/"),
      },
    },
    test: {
      global: true,
      environment: "jsdom",
      setupFiles: ["./src/setupTest.js"],
    },
  };
});
