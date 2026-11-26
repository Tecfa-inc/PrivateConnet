# PrivateConnet — rules for anyone (human or AI) working in this repository

PrivateConnet is an invitation-only dating and connection platform, launching in Liberia. The approved project documents are the source of truth:

- PRD (requirement IDs such as ONB-05, CAL-02): https://claude.ai/artifact/L2CRQP4xWdogjk6MonqT76
- Technical architecture: https://claude.ai/artifact/QLfrkz35mLPcbiUTy7t9WD
- Screens: https://claude.ai/artifact/9g3w3BuLZKuirFWXk58fps
- Design system: https://claude.ai/artifact/JDdkPGaJVMjkSk3gEDXRDF

If a change would contradict these, stop and ask. Never change an approved requirement silently.

## Non-negotiable product rules

1. A member's phone number reaches a browser only through the reveal endpoint, only for a Connected member who is not blocked, and only within calling hours. Every reveal writes a `NumberReveal` row. Never include a number in a list, page props or an API response for any other purpose.
2. No SMS of any kind.
3. Admins create every profile. A profile is not discoverable until its owner signs in and confirms it.
4. Members have no password: they use a single-use link and their date of birth, then a 90-day device session with an optional PIN.
5. Staff sign in with a password and an authenticator app. No admin page loads without two-step sign-in.
6. Email and push text is always neutral: "You have a new update on PrivateConnet." Never include names, photos or places.
7. Legal name, date of birth, phone and backup contact live in `MemberPrivate` and are encrypted. Never join `MemberPrivate` into a member-facing query.
8. `AuditLog` is insert-only (a database trigger enforces it). Every staff action and every staff reveal of private data writes one row.
9. No pricing, services or paid-arrangement features. Relationships and friendship only.
10. Sorting, filters and searches never reveal blocked members to each other.

## Engineering rules

- TypeScript strict. Validate every input with zod on the server.
- Authorization is checked on the server for every action: role (`src/lib/auth/permissions.ts`), relationship (owner or connection), then state.
- No secrets in code or in the repository. Settings come from environment variables, validated in `src/lib/env.ts`.
- Member-app UI follows the design system: body text 17px, minimum 15px, touch targets 48px, one pink (`pink-500`) button per screen, pink text only in `pink-800`.
- Light pages: the first member page must stay under 500 KB.
- Every requirement marked Must in the PRD needs an automated test.
- Commit messages reference requirement IDs where relevant.
