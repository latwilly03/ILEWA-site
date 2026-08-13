# ILEWA Referral Waitlist

This kit adds a referral-ranked waitlist to the existing ILEWA React site without changing Netlify hosting.

## What it does

- Gives every verified member a unique `?ref=CODE` share link.
- Ranks members by verified referrals, with signup time as the tiebreaker.
- Counts a referral only after the referred person confirms their email.
- Shows position, verified referral count, rewards, and share buttons.
- Captures UTM attribution for Instagram, TikTok, creators, brands, and ads.
- Keeps the Supabase server secret inside Netlify Functions.
- Adds a honeypot, email verification, function rate limits, and optional Cloudflare Turnstile.

## Architecture

The React component calls three same-domain endpoints:

1. `POST /api/waitlist/signup` creates or refreshes a signup and sends an email.
2. `GET /api/waitlist/confirm` verifies the email and redirects to the private dashboard.
3. `POST /api/waitlist/status` returns the member's position and verified referral count.

Netlify continues to host the website and runs the serverless endpoints. Supabase stores the members and referral relationships. Resend sends confirmation and dashboard emails.

## Install into the ILEWA repository

1. Copy `netlify/functions`, `src/ReferralWaitlist.jsx`, `src/referralConfig.js`, and `src/referral-waitlist.css` into the matching locations in the ILEWA repository.
2. Merge the dependency from this kit's `package.json` into the site's package file:

   ```bash
   npm install @supabase/supabase-js
   ```

3. Merge `netlify.toml.snippet` into the existing `netlify.toml`. Preserve every existing build, redirect, and plugin setting.
4. Run `database/referral-engine.sql` in the Supabase SQL editor.
5. Add a `/waitlist` route that renders the component:

   ```jsx
   import ReferralWaitlist from "./ReferralWaitlist";

   export default function WaitlistPage() {
     return (
       <ReferralWaitlist
         turnstileSiteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
         referralBaseUrl="https://ilewa.world/"
         source="ilewa-site"
       />
     );
   }
   ```

   If the app uses Create React App instead of Vite, pass `process.env.REACT_APP_TURNSTILE_SITE_KEY` and rename the public environment variable accordingly.

6. Point every existing waitlist button to `/waitlist`, or embed the component in the current landing page.

## Configure email verification

1. Create a Resend account.
2. Add a sending subdomain such as `updates.ilewa.world`.
3. Add the DNS records Resend provides wherever the ILEWA domain DNS is managed.
4. After verification, create an API key.
5. Use a sender such as `ILEWA <hello@updates.ilewa.world>`.

The sending subdomain does not replace the website domain or Netlify. It only authenticates outgoing email.

## Add Netlify environment variables

In Netlify, open **Site configuration → Environment variables** and add the values shown in `.env.example`.

Required:

- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` or the older `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `WAITLIST_FROM_EMAIL`
- `SITE_URL=https://ilewa.world`
- `WAITLIST_PAGE_URL=https://ilewa.world/waitlist`

Never name a Supabase secret `VITE_*` or `REACT_APP_*`. Those prefixes place values in public browser code.

## Add bot protection

Email verification prevents unverified addresses from increasing referral counts. For additional protection:

1. Create a Cloudflare Turnstile widget for `ilewa.world`.
2. Add its secret as `TURNSTILE_SECRET_KEY` in Netlify with Functions scope.
3. Add `TURNSTILE_ALLOWED_HOSTNAME=ilewa.world`.
4. Add the public site key as `VITE_TURNSTILE_SITE_KEY` for the frontend build.

When the secret is configured, the signup endpoint rejects submissions without a valid server-verified Turnstile token.

## Import the existing 60 signups

The bottom of `database/referral-engine.sql` includes an import template. Replace `legacy_waitlist`, `first_name`, and `created_at` with the real current table and column names.

Only mark old signups as verified if the original form collected valid email consent. Otherwise import them without `verified_at`, then invite them to confirm through the new form. Existing verified members can enter their email again to receive a private dashboard link.

## Reward defaults

Edit `src/referralConfig.js` before launch. The included starting tiers are:

- 1 verified referral: Founding Member badge
- 3: Priority early access
- 5: First-drop access
- 50: $10 launch credit

The $10 launch credit unlocks only after 50 verified referrals. Publish complete reward terms, including redemption and expiration rules, before launch.

## Test before announcing

1. Deploy to a Netlify deploy preview with preview-specific environment variables.
2. Join with email A, confirm it, and copy its referral link.
3. Open that link in a private browser and join with email B.
4. Confirm email B.
5. Refresh email A's dashboard. It should show one verified referral and a higher position.
6. Repeat email B without confirming. It must not increase the referral count.
7. Test an invalid referral code, an expired confirmation link, a duplicate email, and the mobile layout.
8. Confirm that the Supabase secret never appears in browser source, network responses, or the built JavaScript files.

## Track the growth loop

Review these weekly:

- New verified signups
- Landing-page-to-signup conversion
- Signup-to-email-verification rate
- Share rate
- Percentage of members who refer at least one verified person
- Viral coefficient: average verified referrals per verified member
- Signups by brand, creator, ambassador, and UTM campaign
- Reward liability

The first operating target should be a viral coefficient above `1.0`. A coefficient of `2–3` should be treated as a stretch outcome to prove through data, not an assumption.
