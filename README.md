This is a Next.js inventory management application built with Prisma and SQLite.

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Tech Stack

- [Next.js](https://nextjs.org) - React framework with App Router
- [Prisma](https://prisma.io) - ORM for database access
- SQLite - Local database via libsql adapter
- [Tailwind CSS](https://tailwindcss.com) - Utility-first CSS framework

## Features

- Add, edit, and delete inventory items
- Fields: title, description, quantity, category, location, tags
- Input validation with user-friendly error messages
- REST API: `GET/POST /api/items`, `PUT/DELETE /api/items/[id]`

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.


## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
