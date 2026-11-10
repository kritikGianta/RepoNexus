# RepoNexus frontend

React 18 + Vite + TypeScript single-page app. In Docker it is served by Nginx on
http://localhost:8080, which also proxies `/api` to the backend.

## Develop

```bash
npm install
npm run dev        # http://localhost:5175, proxies /api to http://localhost:8000
npm run build      # type-check (tsc -b) and production build
npm run preview
```

The only build-time setting is `VITE_API_URL` (default `/api/v1`, which works with both the Vite proxy
and Nginx). The GitHub OAuth client ID is never needed in the browser: the backend builds the
authorize URL.

## Structure

```
src/
├── pages/                 one file per route (lazy-loaded); LandingPage is the public home page
├── components/
│   ├── landing/           landing-page motion primitives and copy
│   ├── Layout.tsx         authenticated app shell (sidebar, command palette, setup banner)
│   └── SetupBanner.tsx    shows which API keys are missing (reads /api/v1/system/status)
├── lib/api.ts             fetch wrapper: auth header, 401 handling, error toasts
├── stores/                Zustand stores (auth token, history)
└── types/                 API contracts
```

## Landing page design

The home page uses its own palette (`nx-*` colors in `tailwind.config.js`: paper `#f2f0e7`,
ink `#181a17`, acid `#dce87a`, olive `#a4b342`) with Hanken Grotesk for display type and Fraunces
italic for accents. Motion primitives live in `src/components/landing/motion.tsx`:

| Primitive | Effect |
|-----------|--------|
| `LineRise` | headline words rise out of a clipped line, staggered 120 ms |
| `Reveal` | content rises 56 px and un-blurs as it enters the viewport |
| `WipeImage` | image is wiped in from the bottom while settling from 1.18× zoom |
| `ScrollStatement` | statement words brighten as the paragraph scrolls past |
| `Marquee` | seamless ticker of tool names (pauses on hover; slows down instead of stopping with reduced motion) |
| `Signoff` | oversized footer wordmark whose letters spring up and lift on hover |

All motion uses `cubic-bezier(.32,.72,0,1)` (springy elements use `cubic-bezier(.34,1.56,.64,1)`) and
is disabled for users who prefer reduced motion. Illustrations are SVGs in `public/landing/`.

The authenticated app (`/app/*`) keeps its existing light dashboard theme.
