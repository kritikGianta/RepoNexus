# RepoNexus Frontend

React + Vite + TypeScript frontend for the RepoNexus repository intelligence platform.

## Features

- **GitHub OAuth Login** — Authenticate via GitHub to connect repositories
- **Dashboard** — Overview of connected repos, debt scores, and alerts
- **Repositories** — Connect/disconnect GitHub repos, register webhooks
- **Analysis Runs** — Trigger analysis, monitor progress with auto-polling
- **Debts** — Browse, filter, and review AI-discovered technical debt with code snippets
- **Trends** — Visualize debt score evolution over time with interactive charts
- **Settings** — Profile view, API config, logout

## Tech Stack

- React 18, TypeScript, Vite 5
- TailwindCSS 3 (custom dark theme)
- React Query (TanStack) for data fetching
- Zustand for auth state management
- Recharts for data visualization
- Lucide React for icons

## Setup

```bash
# Install dependencies
npm install

# Create .env from template
cp .env.example .env
# Edit .env with your backend URL and GitHub Client ID

# Development server
npm run dev

# Production build
npm run build
npm run preview
```

## Environment Variables

| Variable               | Description                    | Default                          |
|------------------------|--------------------------------|----------------------------------|
| `VITE_API_URL`         | Backend API base URL           | `http://localhost:8000/api/v1`   |
| `VITE_GITHUB_CLIENT_ID`| GitHub OAuth App Client ID    | —                                |

## Deployment

### Vercel (recommended for free hosting)
1. Push to GitHub
2. Connect repo to Vercel
3. Set environment variables in Vercel dashboard
4. Framework: Vite, Build: `npm run build`, Output: `dist`

### Netlify
1. Push to GitHub
2. New site → connect repo
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Add `_redirects` file for SPA routing: `/* /index.html 200`
