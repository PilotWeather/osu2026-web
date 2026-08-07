# ÖSU 2026

ÖSU 2026 is a Next.js dashboard for flight-instructor personnel, team, vehicle, and credential-expiry tracking. PostgreSQL is the only runtime data source; private source documents are never served by the application.

## PostgreSQL setup with Neon

1. Sign in to the [Neon Console](https://console.neon.tech/) and create a project named `osu2026` in a region close to the Vercel deployment.
2. Keep the default PostgreSQL database or create one named `osu2026`.
3. From the project dashboard, choose **Connect**, select the database and owner role, and copy the PostgreSQL connection string. Neon documents this flow in its [getting-started guide](https://neon.com/docs/get-started/why-neon) and [Prisma migration guide](https://neon.com/docs/guides/prisma-migrations).
4. Create `.env.local` in the repository root. It is gitignored.

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DBNAME?sslmode=require"
```

Use the real value copied from Neon. Never commit it or paste it into source code.

## Create the schema and import personnel

Install dependencies, apply the committed migration to a development database, and generate Prisma Client:

```bash
npm install
npm run prisma:migrate:dev
npm run prisma:generate
```

The private source PDF must exist locally at `data/OSU2026-PERSONEL.pdf`. Import it with:

```bash
npm run import:personnel
```

The importer is idempotent. It updates personnel identified by national ID or the deterministic `osu2026:<source sequence>` source key, upserts companies, teams, vehicles, and credentials, and stops if those identities conflict.

For later schema changes, edit `prisma/schema.prisma`, run `npm run prisma:migrate:dev -- --name <change_name>`, review the generated SQL, and commit the migration. Use `npm run prisma:migrate:deploy` to apply committed migrations in production. Do not use `db push` for production.

## Vercel

In **Vercel → osu2026-web → Settings → Environment Variables**, add `DATABASE_URL` to Production. Add a separate Neon development/preview branch URL to Preview if preview deployments should access a database. Environment changes apply only to new deployments; redeploy after adding the variable. See [Vercel environment variables](https://vercel.com/docs/environment-variables).

Apply migrations and import the source data before sending production traffic:

```bash
npm run prisma:migrate:deploy
npm run import:personnel
```

Run these commands from a trusted environment with the production `DATABASE_URL`; migrations are not executed automatically during every Vercel build.

## Development

```bash
npm install
npm run dev
```

The application intentionally fails with a clear server error when `DATABASE_URL` is missing. There is no JSON or SQLite runtime fallback.

## Validation

```bash
npm run prisma:generate
npm run lint
npm run build
```

Production domain: <https://osu2026.pilotweather.pro>
