# JOHNSON DIGITAL

A responsive static website for JOHNSON DIGITAL, built with plain HTML, CSS and JavaScript. Supabase Edge Functions provide the optional server-side contact and media-management API.

## Run locally

Open `index.html` in a browser or serve this folder with any static web server. Google Fonts, Turnstile, Unsplash and the Supabase image catalogue require an internet connection. No npm packages are required by the website or Edge Function source.

## Before publishing

The app's public `config.js` contains no Supabase, Resend or Turnstile secrets. Before enabling the API, configure `config.js` with:

- `formEndpoint`: `https://YOUR-PROJECT-REF.supabase.co/functions/v1/jd-portal`
- `mediaAdminUrl`: the same HTTPS function URL; the website adds the protected admin page route.
- `turnstileSiteKey`: the public Cloudflare Turnstile site key for the final domain.
- `siteUrl`: the website's HTTPS origin (no path or trailing route).
- `socialLinks`: add official Instagram, Facebook, LinkedIn, TikTok, and YouTube HTTPS profile URLs. Unconfigured links stay hidden.

Supabase automatically provides `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` to hosted Edge Functions. Do not copy or override those project credentials in the repository. Copy `.env.example` to a private `.env.local` file and set its values. The function also requires `RESEND_API_KEY`, `EMAIL_FROM` (a sender verified with Resend), `TURNSTILE_SECRET_KEY`, `RATE_LIMIT_SECRET` (a long random value), `ADMIN_EMAILS` (comma-separated allowlisted Supabase Auth email addresses) and `APP_ORIGIN` (the exact public HTTPS site origin). Keep the service-role key and all provider secrets server-side. The Turnstile **site key** is public and belongs in `config.js`; its secret key belongs only in Supabase Function secrets.

## Supabase setup

1. Create a Supabase project and a Supabase Auth administrator for each trusted site manager. The address must also appear in `ADMIN_EMAILS`.
2. With the Supabase CLI installed, run `supabase link --project-ref YOUR-PROJECT-REF`, then `supabase db push` and `supabase functions deploy jd-portal` from the project folder. `supabase/config.toml` deliberately disables gateway JWT checks for this one public entry point; the function validates administrator sessions itself and never returns the service-role key.
3. Configure the custom values in `.env.local` as Supabase Function secrets with `supabase secrets set --env-file .env.local`. Do not add Supabase's automatically provided `SUPABASE_*` values to this file. Set the exact production origin in `APP_ORIGIN`.
4. Create a Resend account, verify a sender domain, and set `EMAIL_FROM` to a sender on that verified domain. Enquiry mail is sent to `johnsonokemwa7@gmail.com`.
5. Create a Cloudflare Turnstile widget for the final website domain and set the public site key in `config.js` and the private secret as a Supabase Function secret.
6. Set `formEndpoint`, `mediaAdminUrl` and `siteUrl` in `config.js`. The `siteUrl` updates canonical and social-preview metadata when JavaScript runs; also replace `YOUR-DOMAIN.example` in `index.html` so crawlers that do not execute JavaScript receive the final canonical/Open Graph/Twitter URLs.
7. Deploy the static website over HTTPS. Sign in to the media library using an allowlisted Supabase Auth account.

The function validates input server-side, requires consent and a server-verified Turnstile token, checks a hidden honeypot, rate-limits contact submissions and admin sign-in using an atomic database function, keeps administrator sessions in Secure/HttpOnly/SameSite cookies, checks an explicit email allowlist, validates image MIME signatures and file sizes, and restricts media mutations to authenticated administrators. The image bucket is intentionally public-read for published website images and private-write through the function. Direct anonymous/authenticated writes are not granted.

The image library initially contains the current site's image slots. Upload/replacing an image using one of these keys updates that image on the public site; new keys appear in the library but must also be added to a page section before they are displayed. Image uploads are resized/compressed to WebP in the browser when supported, with original format fallback.

No Supabase, Resend or Turnstile account has been connected or deployed from this local workspace. The privacy page is a pre-launch notice, not legal advice or a complete privacy policy. Confirm processing, retention, service-provider, rights and jurisdiction-specific details before collecting enquiries. Replace the demonstration portfolio concepts with approved agency work before presenting them as client projects.
