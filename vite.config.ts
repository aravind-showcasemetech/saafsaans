import { type Plugin, defineConfig } from "vite";

/** Preloads only the Latin 400 font (the body text); every other face loads when it is used. */
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

export default defineConfig({
  plugins: [preloadBodyFont()],
  build: {
    outDir: "dist/client",
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
