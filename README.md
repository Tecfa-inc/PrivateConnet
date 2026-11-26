# PrivateConnet

An invitation-only dating and connection platform, launching in Liberia. This is a single Next.js app that serves three sites:

- the member app (`app.privateconnet.com`)
- the admin site (`admin.privateconnet.com`)
- the public pages (`privateconnet.com`)

## Stack

| Part | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript |
| Runtime | Node.js 26 LTS |
| Database | PostgreSQL 18, Prisma 7 |
| Staff sign-in | Better Auth (password + authenticator app) |
| Member sign-in | Single-use link + date of birth, 90-day device session (custom) |
| Styling | Tailwind CSS 4 with the PrivateConnet design tokens |
| Jobs | pg-boss (queue inside PostgreSQL) |
| Images | sharp |

## Getting started

```bash
cp .env.example .env          # then fill in values; generate keys as described in the file
npm install
npx prisma migrate dev        # creates the database tables
npm run dev
```

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Starts the app locally |
| `npm run build` | Production build (standalone output) |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | ESLint |
| `npm test` | Unit tests (Vitest) |
| `npm run db:validate` | Checks the Prisma schema |

## Project status

This branch delivers Stage 05, milestone M1 (Foundations): project setup, database schema, security helpers, the permissions matrix as code, design tokens and CI. See `CLAUDE.md` for the rules every change must follow.
