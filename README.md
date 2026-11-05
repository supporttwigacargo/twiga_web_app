# Twiga Star Cargo — internal web app

Internal staff operations app for **Twiga Star Cargo**: shipment management, customers, payments, expenses, packing lists and staff roles. Built with React 19, Vite and Tailwind CSS 4.

This is a **private, internal-only** project — not the public website. The customer-facing marketing site and live tracking page live in the separate [`twiga-star-website`](https://github.com/twiga-star2026/twiga-star-website) repository (public), which reads shipment data written by this app through a shared Supabase project.

## Current status

This started as a Figma Make prototype and has since been migrated onto Supabase as the single source of truth:

- [x] `useAppStore.ts` (customers, shipments, packing lists, payments, expenses, settings) reads/writes Supabase instead of `localStorage`.
- [x] `useAuthStore.ts` uses real Supabase Auth (`signInWithPassword`) instead of a hardcoded plaintext password.
- [x] Row Level Security restricts every table to `authenticated` staff; the public website can only call the `track_shipment()` RPC, never the tables directly.

Two things still need a person, not code, because they require the `service_role` key (admin API), which this browser-only app must never hold:

- **Creating a new staff login.** Invite them from the Supabase dashboard → Authentication → Users. Their `staff_profiles` row is created automatically the first time they sign in (see the `handle_new_auth_user` trigger); an Admin then sets their role from the Staff Roles screen.
- **Resetting someone else's password.** Also a Supabase dashboard action — `useAuthStore.updateUser`/`changePassword` only support changing your *own* password from within the app.

The demo-credential buttons on the Login screen (`admin@twiga-starcargo.com` / `ops@twiga-starcargo.com`) only work once those two accounts actually exist in Supabase Auth — create them via the dashboard with those emails, matching whatever passwords you choose.

## Modules

- **Dashboard** — operational overview
- **Create Shipment / Shipment Detail** — shipment lifecycle and status timeline
- **Public Tracking** — internal preview of what the website's tracking page shows
- **Packing List** — grouping shipments for dispatch
- **Customers** — customer records
- **Payments / Expenses** — financial tracking
- **Staff Roles** — user/role management
- **Settings** — company configuration

## Local development

```bash
pnpm install   # or npm install — pnpm-lock.yaml is the source of truth
pnpm dev
```

```bash
pnpm build     # production build (vite build)
pnpm preview   # preview the production build locally
```

## Shared backend

`supabase/migrations/0001_shipments_and_auth.sql` defines every table this app reads/writes (`customers`, `shipments`, `packing_lists`, `payment_records`, `expenses`, `company_settings`, `staff_profiles`), Row Level Security (authenticated staff get full CRUD; nothing is open to the public key), and the `track_shipment()` function the public website calls for tracking. Apply it to a Supabase project via the SQL editor or `supabase db push`, then copy `.env.example` to `.env.local` and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY` — the **publishable** key from Supabase project settings. Never put the `service_role` key in this app.

## Deployment

Configured for Netlify (see `netlify.toml`) as a static SPA (`vite build` → `dist/`).
