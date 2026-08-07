# ÖSU 2026

## Overview

This project contains a polished MVP for managing ÖSU 2026 flight instructor personnel. The interface focuses on a professional admin experience with search, team/company filters, credential expiry visibility, and a detail drawer for each instructor.

The current implementation uses a local development dataset for the UI and exposes a service layer that is ready for a PostgreSQL/Prisma backend when a connection string is available.

## Development

```bash
npm install
npm run dev
```

Open http://localhost:3000 to view the dashboard.

## Environment Variables

Create a local environment file using the template:

```bash
cp .env.example .env.local
```

Add your PostgreSQL connection string:

```env
DATABASE_URL="postgresql://..."
```

## Database

The project includes a Prisma schema for:

- Company
- Team
- Personnel
- Vehicle
- Credential

The schema is designed to be portable and ready for PostgreSQL.

## Prisma

Generate the Prisma client:

```bash
npx prisma generate
```

Seed the database once a PostgreSQL connection is available:

```bash
npx prisma db push
npx prisma db seed
```

## Importing Personnel

The import utility is available in scripts/import-personnel.ts. It is structured to support future Excel import flows and currently normalizes tabular input for future spreadsheet ingestion.

Example:

```bash
npx tsx scripts/import-personnel.ts ./data/personnel.tsv
```

## Deployment

The project is designed for Vercel and the production domain is:

https://osu2026.pilotweather.pro

## Domain

Production domain: https://osu2026.pilotweather.pro
