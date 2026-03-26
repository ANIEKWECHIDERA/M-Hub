# Website Deployment Guide

This website is a separate Next.js marketing app inside the `website/` folder.

## Recommended Production Setup

- Marketing website: `https://www.trycrevo.com`
- Product app: `https://app.trycrevo.com`
- Product login route: `https://app.trycrevo.com/login`

This split keeps the public landing site on the root domain and avoids routing conflicts with the authenticated product app.

## Netlify Project Settings

If you deploy from the repo root, the root `netlify.toml` already points Netlify at `website/`.

Equivalent Netlify UI settings:

- Base directory: `website`
- Build command: `npm run build`
- Publish directory: leave blank for Next.js runtime
- Node version: `20`

## Required Environment Variables

Set these in the Netlify site dashboard for the website project:

- `NEXT_PUBLIC_SITE_URL=https://www.trycrevo.com`
- `NEXT_PUBLIC_APP_URL=https://app.trycrevo.com/login`
- `NEXT_PUBLIC_SUPABASE_URL=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`
- `WAITLIST_ADMIN_EMAIL=...`
- `WAITLIST_ADMIN_PASSWORD=...`
- `WAITLIST_ADMIN_SESSION_SECRET=...`
- `SMTP_PASS=...`

Optional mail overrides only if you really need them:

- `CONTACT_INBOX_EMAIL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_FROM`

Netlify secrets scanning:

- keep secrets scanning enabled
- allow Netlify to ignore expected public/non-secret keys that appear in build output:
  - `NEXT_PUBLIC_SITE_URL`
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `SMTP_HOST`
  - `SMTP_PORT`
  - `SMTP_USER`
  - `SMTP_FROM`
  - `CONTACT_INBOX_EMAIL`
  - `WAITLIST_ADMIN_EMAIL`
- this is already configured in `website/netlify.toml`

## Domain Setup

Recommended:

1. Connect `www.trycrevo.com` to the Netlify website project.
2. Keep the product app on `app.trycrevo.com`.
3. Configure DNS so `www` points to Netlify and `app` points to the product host.

If you later want `trycrevo.com` without `www`, make it redirect to `https://www.trycrevo.com`.

## Safe Deployment Checklist

1. Replace the current Supabase anon key with the real service-role key for the website server actions.
2. Confirm the `waitlist` table exists in Supabase using `website/supabase/waitlist.sql`.
3. Confirm SMTP auth still succeeds for `notify@trycrevo.com`.
4. Verify `/waitlist`, `/contact`, and `/ops/login` after deploy.
5. Verify `Log in` on the website opens `https://app.trycrevo.com/login`.
6. Keep the website and product app as separate deployments.

## Why The App Link Changed

The product app now treats unauthenticated users as `/login` and authenticated users as `/dashboard`.

That is fine, but the marketing website should not own those same routes on `www.trycrevo.com`.

The safe approach is:

- website on `www.trycrevo.com`
- product on `app.trycrevo.com`

Then the website can always send visitors to the product login URL without route collisions.

## Secrets Scanning Safety

To reduce secret exposure risk in deploy output:

- keep real secrets only in the Netlify environment dashboard
- do not commit `website/.env`
- only `NEXT_PUBLIC_*` values should be considered browser-safe
- the website now uses safe defaults for these non-secret mail values, so you can usually omit them from Netlify entirely:
  - inbox email
  - SMTP host
  - SMTP port
  - SMTP user
  - SMTP from
