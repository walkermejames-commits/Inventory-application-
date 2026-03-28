# Inventory App

A clean, minimal inventory management application built with Next.js 16, TypeScript, and Tailwind CSS.

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: ESLint (Next.js config)
- **Formatting**: Prettier

## Getting started

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd inventory-app

# Install dependencies
npm install

# Copy environment file and fill in values
cp .env.example .env.local
```

### Run in development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The landing page confirms the app is running.

### Health check

```
GET /api/health
```

Returns `{ "status": "ok", "timestamp": "<ISO date>" }`.

## Scripts

| Command                | Description                        |
| ---------------------- | ---------------------------------- |
| `npm run dev`          | Start the development server       |
| `npm run build`        | Build for production               |
| `npm run start`        | Start the production server        |
| `npm run lint`         | Run ESLint                         |
| `npm run format`       | Format all files with Prettier     |
| `npm run format:check` | Check formatting without writing   |

## Project structure

```
├── app/              # Next.js App Router pages and API routes
│   ├── api/health/   # Health-check endpoint
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Landing page
├── components/       # Shared React components
├── hooks/            # Custom React hooks
├── lib/              # Shared utilities and helpers
├── types/            # TypeScript type definitions
├── public/           # Static assets
├── .env.example      # Example environment variables
└── .prettierrc       # Prettier configuration
```

## Environment variables

See [`.env.example`](.env.example) for all supported variables. Copy it to `.env.local` before running locally.

## What comes next

- Database integration (e.g. PostgreSQL via Prisma)
- Authentication
- CRUD UI for inventory items (list, add, edit, delete)
- Search and filtering
