import { type Plugin, defineConfig, loadEnv } from "vite";

/** Preloads only the hero heading face (Anek Latin 700); every other face loads when it is used. */
function preloadBodyFont(): Plugin {
  return {
    name: "preload-body-font",
    transformIndexHtml: {
      order: "post",
      handler(_html, ctx) {
        const file = Object.keys(ctx.bundle ?? {}).find((f) =>
          /noto-sans-latin-400-normal-[\w-]+\.woff2$/.test(f),
        );
        if (!file) return [];
        return [
          {
            tag: "link",
            attrs: {
              rel: "preload",
              href: `/${file}`,
              as: "font",
              type: "font/woff2",
              crossorigin: "",
            },
            injectTo: "head",
          },
        ];
      },
    },
  };
}

export default defineConfig(({ mode }) => ({
  plugins: [preloadBodyFont()],
  build: {
    outDir: "dist/client",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // The API server's port from .env (PORT), so npm run dev works whatever it is set to.
        // Only PORT is read here; nothing from .env reaches the browser bundle.
        target: `http://localhost:${loadEnv(mode, process.cwd(), "").PORT || 3000}`,
        changeOrigin: true,
      },
    },
  },
}));
