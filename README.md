# Finance Tracker

A personal finance tracker: sign in with GitHub, record income and expenses,
set monthly budgets per category, and see where the money went in a monthly
overview.

Built with:

- **Next.js 16** (App Router, Server Components, Server Actions, `proxy.ts` auth gate)
- **Prisma 7** + PostgreSQL (driver adapter `@prisma/adapter-pg`)
- **NextAuth v5** (Auth.js) with the GitHub provider and Prisma adapter
- **Tailwind CSS v4** + **shadcn/ui** components
- **Vitest** for unit tests

## Requirements

- Node.js 22+
- A PostgreSQL database ([Neon](https://neon.tech), local Postgres, Supabase, …)
- A GitHub OAuth app (created below)

## Local setup

### 1. Install dependencies

```bash
npm install
```

`postinstall` runs `prisma generate`. If you ever pull a schema change and see
type errors about a real column, run `npx prisma generate` manually.

### 2. Configure environment variables

```bash
cp .env.example .env
```

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string. On Neon, copy the pooled connection string. |
| `AUTH_SECRET` | Session encryption secret. Generate with `npx auth secret` or `openssl rand -base64 32`. |
| `AUTH_GITHUB_ID` | Client ID of your GitHub OAuth app. |
| `AUTH_GITHUB_SECRET` | Client secret of your GitHub OAuth app. |

### 3. Create a GitHub OAuth app

1. Go to [GitHub → Settings → Developer settings → OAuth Apps](https://github.com/settings/developers) and click **New OAuth App**.
2. **Homepage URL**: `http://localhost:3000`
3. **Authorization callback URL**: `http://localhost:3000/api/auth/callback/github`
4. Copy the Client ID and generate a client secret into your `.env`.

GitHub OAuth apps allow only one callback URL, so use a **second OAuth app**
for production (with `https://your-domain/api/auth/callback/github`) rather
than editing the local one.

### 4. Apply database migrations

```bash
npx prisma migrate deploy
```

This applies the committed migrations to your database. Use
`npx prisma migrate dev` only when you are developing a schema change.

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The first sign-in seeds a
small set of default categories. The root route renders the sign-in screen;
every other route is gated by the auth proxy in `src/proxy.ts`.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server (Turbopack). |
| `npm run build` | Production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `next typegen` + `tsc --noEmit`. |
| `npm test` | Run the Vitest suite once (CI mode). |
| `npm run test:watch` | Vitest in watch mode. |

Tests live next to the code (`src/**/*.test.ts`). They run with
`TZ=Asia/Yangon` on purpose: transaction dates are UTC calendar dates, and the
suite should fail if any local-time date math creeps back in.

## Deploying

1. Push the repo to GitHub. CI (`.github/workflows/ci.yml`) runs lint,
   typecheck, tests, and the production build on every push and pull request.
2. Import the repo into Vercel (or any Node host) and set the same
   environment variables as `.env`, using the **production** GitHub OAuth app's
   credentials.
3. Run migrations against the production database once per deploy that adds
   one, from a machine that has the production `DATABASE_URL`:

   ```bash
   DATABASE_URL="postgres://…" npx prisma migrate deploy
   ```

   Builds do not run migrations, and every page is dynamic, so the build step
   never needs database access.
4. Add `https://your-domain/api/auth/callback/github` as the production
   GitHub OAuth app's callback URL.

## Conventions worth knowing

- **Dates are calendar dates stored as UTC midnights** (`@db.Date`). All month
  math goes through `src/lib/dates.ts`; never use local-time `Date`
  constructors for transaction dates.
- **Every query is scoped by `userId`** at the database level, and server
  actions re-validate ownership — the UI is never the security boundary.
- **All `FormData` is validated with Zod** inside `src/app/actions.ts` before
  it reaches Prisma.
