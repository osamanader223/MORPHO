import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';

const page = (p) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig(({ mode }) => {
  // index.html needs an absolute VITE_SITE_URL for canonical/og: tags. While .env leaves it
  // empty, Vercel builds use the project's production domain (custom domain once attached)
  // and local builds use the preview server.
  if (!loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL) {
    const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
    process.env.VITE_SITE_URL = vercel ? `https://${vercel}` : 'http://localhost:4173';
  }

  return {
    build: {
      // Ship the approved CSS as written: the minifier rewrites rgba() to rounded hex and reorders rules.
      cssMinify: false,
      rolldownOptions: {
        // One entry per page. Add `drop: page('./drop/index.html')` when the Drop 02 pre-order page ships.
        input: {
          main: page('./index.html'),
        },
      },
    },
  };
});
