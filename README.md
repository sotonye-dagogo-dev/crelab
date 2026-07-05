# Crelab

A dark, cinematic marketplace where video is the first thing you see and quality speaks louder than follower count.

## Stack

- **Framework:** Next.js 15 (App Router)
- **Language:** TypeScript (strict)
- **Database:** PostgreSQL (Supabase) + Drizzle ORM
- **Auth:** Better Auth v1.6
- **Styling:** Tailwind CSS v4 + shadcn/ui (Cl\* wrappers)
- **Animation:** Framer Motion v12
- **Payment:** Paystack (primary) + Flutterwave (fallback)
- **Video:** Cloudinary (upload/thumbnails) + Mux (streaming)
- **CMS:** Sanity CMS

## Getting Started

```bash
npm install --legacy-peer-deps
npm run dev
```

## Project Structure

```
app/              Next.js App Router (route groups)
  (public)/       Guest-accessible pages
  (auth)/         Authenticated pages
  (admin)/        Admin-only pages
  api/            API routes
components/
  ui/             Cl* wrappers around shadcn/ui
  shared/         Shared feature components
  explore/        Explore feed components
  profile/        Profile page components
  booking/        Booking flow components
  blog/           Blog components
types/            Global TypeScript interfaces
config/           Platform configuration
lib/              Shared utilities and third-party wrappers
services/         OOP service classes
drizzle/          Drizzle schema and migrations
```

## Architecture Principles

1. Config before code — platform values from `platform.config.ts`
2. Wrapper components — all shadcn/ui via Cl\* wrappers
3. Interface-first — types defined before implementation
4. Money in kobo — all monetary values are integers
5. Privacy by design — consent records and RLS from day one
