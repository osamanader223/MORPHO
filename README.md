# MORPHO

Link-in-bio page for Morpho (مورفو), streetwear from Jeddah. Vite + vanilla JS + three.js `0.128.0` (pinned on purpose: newer versions shift the shader colours). Every push to `main` deploys to production on Vercel.

```
npm install
npm run dev        # local dev server
npm run build      # production build into dist/
npm run preview    # serve dist/ on http://localhost:4173
npm run shoot      # after a build: parity screenshots into reference/screens/build-*.png
```

## Where to edit

| what | where |
|---|---|
| Link URLs, Drop 02 card | `index.html` |
| Intro captions, ticker words, hint text | `src/ui.js` |
| Intro timings (`intro`, `skip`, `remorph`) | `src/timeline.js` |
| Particles, shaders, forest, flyers | `src/scene/` |
| Site URL for social previews | `.env` (`VITE_SITE_URL`) |

`reference/morpho-link-v2.html` is the approved design and `reference/screens/` the approved states. They are kept for parity checks and are not deployed.
