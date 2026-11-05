# Twiga Star Cargo LLC

Staff cargo management app with a customer tracking website.

- Root: React/Vite staff app.
- `website/`: Next.js customer website, prepared from the supplied Twiga backup.
- Supabase project: `wcieatxnazsceugdlofl`.
- `track_shipment(p_tracking_number)`: anonymous status and public timeline lookup. Customer contacts, financial records and internal notes are excluded.

## Staff app
Copy `.env.example` to `.env.local`, set the project URL and publishable key, then run `npm install` and `npm run dev`.

## Website
In `website/`, copy `.env.example` to `.env.local`, set the publishable key, then run `npm install` and `npm run dev`. Vercel website root directory: `website` when deploying from this repository.

## Backend
The original migrations and the Twiga company/tracking migration have been applied to the hosted project. Staff login, staff administration and password change Edge Functions are deployed. New Auth users start inactive; an Admin must provision/activate staff.

## Deployment status
Backend is configured. Website production deployment awaits Vercel authorization for the existing `twigacargo-website` project. First Admin email: support.twigacargo@gmail.com; the Auth user has not yet been provisioned.
