---
name: nextjs-gh-pages
description: Deploy Next.js static export to GitHub Pages with correct config, Tailwind v3, and modern Actions workflow
source: auto-skill
extracted_at: '2026-07-08T03:36:55.287Z'
---

# Next.js Static Export to GitHub Pages

## Context
Deploying a Next.js app as a fully static site to GitHub Pages. Common templates contain multiple errors that must be fixed.

## Correct Configuration

### next.config.js — Static Export

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',        // ✅ Generates static HTML to out/
  images: {
    unoptimized: true,     // ✅ Required for static export
  },
  basePath: '/repo-name',  // ✅ Match GitHub Pages subpath
  trailingSlash: true,     // ✅ Avoids 404s on directories
};
module.exports = nextConfig;
```

**Pitfalls:**
- Do NOT use `next export` CLI command — it's deprecated in Next.js 13+. Use `output: 'export'` in config.
- `basePath` must match the repo name (e.g., `/snapkitty-agentos` for `user.github.io/snapkitty-agentos/`)
- Root path `/` deploys to `user.github.io/` (needs `basePath: ''`)

### package.json — Separate from Root

When Next.js lives in a subdirectory (e.g., `agentos-frontend/`), it MUST have its own `package.json`. Do NOT overwrite the root package.json.

```json
{
  "name": "agentos-frontend",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.2.29",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "autoprefixer": "^10.4.21",
    "eslint": "^8",
    "eslint-config-next": "14.2.29",
    "postcss": "^8.5.6",
    "tailwindcss": "^3.4.17",
    "typescript": "^5"
  }
}
```

**Pitfalls:**
- Tailwind package is `tailwindcss` (NOT `tailwind`). Version 4 has different config syntax — use v3.4 for standard `tailwind.config.ts`.
- Do NOT use `gh-pages` npm package with GitHub Actions — use native `upload-pages-artifact` + `deploy-pages`.
- No `export` script needed — `next build` handles static export when `output: 'export'` is set.

### tsconfig.json — Import Alias

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

**Pitfall:** Import alias must be `"@/*"` (no leading space). Templates often have `" @/*"` which breaks imports.

### Tailwind v3 Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: { extend: {} },
  plugins: [],
};
export default config;
```

```javascript
// postcss.config.js
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### app/globals.css

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

## GitHub Actions Workflow

Use the modern native Pages deployment (NOT `peaceiris/actions-gh-pages`):

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
    paths:
      - 'agentos-frontend/**'
      - '.github/workflows/gh-pages.yml'
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install dependencies
        working-directory: ./agentos-frontend
        run: npm ci

      - name: Build Next.js
        working-directory: ./agentos-frontend
        run: npm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./agentos-frontend/out

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**Pitfalls:**
- Action references must NOT have spaces: `actions/checkout@v4` (NOT `actions/checkout @v4`)
- Use `upload-pages-artifact@v3` + `deploy-pages@v4` (NOT `peaceiris/actions-gh-pages` which requires a separate `gh-pages` branch)
- `working-directory` must point to the Next.js subdirectory
- Build output is in `out/` directory (not `.next/` or `dist/`)
- Must include `permissions:` block for Pages access

## .gitignore Additions

```
.next/
out/
```

Add these to the root `.gitignore` so build artifacts aren't committed.

## Verification

After `npm run build`, you should see:
```
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Generating static pages (N/N)
○ (Static) prerendered as static content
```

The `out/` directory should contain `index.html`, `_next/`, and any other static assets.

## Summary of Template Errors to Fix

| Error | Fix |
|-------|-----|
| `tailwind` package | Use `tailwindcss` v3.4 |
| `next export` CLI | Use `output: 'export'` in next.config.js |
| `" @/*"` import alias | Remove leading space: `"@/*"` |
| `actions/checkout @v4` | Remove space: `actions/checkout@v4` |
| `peaceiris/actions-gh-pages` | Use native `upload-pages-artifact` + `deploy-pages` |
| Overwriting root package.json | Separate package.json in subdirectory |
| `gh-pages` npm dependency | Not needed with Actions native deploy |
| Tailwind v4 | Use v3.4 (v4 has different config syntax) |
