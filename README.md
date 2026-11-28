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

This branch delivers Stage 05, milestone M3 (Member onboarding and profiles), on top of M1 (Foundations) and M2 (Staff access and member creation). See `CLAUDE.md` for the rules every change must follow.

### Member app routes (M3)

| Path | What |
| --- | --- |
| `/s/{token}` | Single-use sign-in link: date-of-birth check, 5 tries then a 15-minute lock (ONB-05, ONB-06, ONB-12) |
| `/welcome` | Step 2: check your profile, accept terms and privacy notice, publish (ONB-07, US-03) |
| `/welcome/pin` | Step 3: optional 4-digit PIN for this phone (ONB-10) |
| `/unlock` | PIN screen when the app opens on a phone with a PIN |
| `/home`, `/profile`, `/profile/edit`, `/profile/photos`, `/settings` | Signed-in member screens; edits and photos go to review (PRO-01 to PRO-06), sign out everywhere (ONB-11) |
| `POST /api/member/photos` | Photo upload: resized to WebP in three sizes, metadata stripped (PRO-04) |
| `GET /media/{key}/{size}?exp=&sig=` | Private photos, signed for 5 minutes, signed-in members or two-step staff only (NFR-07) |
| `/admin/review` | Review queue for photos and profile edits, reason sent to the member on rejection (ADM-05) |
