# Codingbuddy Landing Page

Multi-AI Rules for Consistent Coding - Landing page built with Next.js 16, shadcn/ui, and Widget-Slot Architecture.

## Tech Stack

- **Framework**: Next.js 16.1.6 (App Router, React Compiler, Partial Prerendering)
- **UI**: shadcn/ui + Tailwind CSS 4
- **i18n**: next-intl (en, ko, zh-CN, ja, es)
- **Testing**: Vitest + Testing Library
- **Analytics**: Vercel Analytics + Speed Insights
- **Deployment**: Vercel

## Getting Started

```bash
# Install dependencies
yarn install

# Development server
yarn dev

# Production build
yarn build

# Run tests
yarn test

# Full validation (lint + format + typecheck + test + circular check)
yarn validate
```

## Deployment

### Vercel Dashboard Setup

1. Import repository from GitHub
2. Set **Root Directory** to `apps/landing-page`
3. Framework will be auto-detected as Next.js
4. Deploy

### Environment Variables

Set in Vercel Dashboard → Settings → Environment Variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `NODE_ENV` | Set to `production` (auto) | No |

### Manual Deployment

```bash
# Install Vercel CLI
npm i -g vercel

# Preview deployment
cd apps/landing-page
vercel

# Production deployment
vercel --prod
```

### Custom Domain

Configure in Vercel Dashboard → Settings → Domains.

## Project Structure

```
src/app/
├── layout.tsx          # Root layout (fonts, theme, analytics)
├── page.tsx            # Root redirect → /en
├── globals.css         # Global styles
└── [locale]/
    ├── layout.tsx      # Locale layout (i18n, header, footer)
    ├── page.tsx        # Main page (Hero, Problem, Solution, FAQ)
    ├── @agents/        # Parallel route: Agents section
    ├── @code_example/  # Parallel route: Code example section
    └── @quick_start/   # Parallel route: Quick start section
```

## Supported Locales

| Locale | Language |
|--------|----------|
| `en`   | English (default) |
| `ko`   | Korean |
| `zh-CN`| Simplified Chinese |
| `ja`   | Japanese |
| `es`   | Spanish |
