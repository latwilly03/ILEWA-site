# Install the referral engine in the current static ILEWA site

The provided ILEWA `index.html` is a static page hosted by Netlify. The updated page already calls the referral endpoints in this kit, so React is not required.

## Files to add to the existing site repository

- Use the updated `index.html` as the homepage.
- Add the complete `netlify/functions` directory.
- Add `package.json` and `package-lock.json`, or merge `@supabase/supabase-js` into the site's existing package file.
- Merge `netlify.toml.snippet` into the existing Netlify configuration.

Do not replace unrelated site assets, pages, redirects, or current Netlify build settings.

## Required setup

1. Run `database/referral-engine.sql` in the Supabase SQL editor.
2. Verify a sending subdomain such as `updates.ilewa.world` in Resend.
3. Add the required values from `.env.example` in Netlify's environment-variable settings.
4. Deploy through the existing Netlify-connected repository.
5. Complete the two-email referral test in the main README before announcing the program.

Do not configure `TURNSTILE_SECRET_KEY` until a matching Turnstile widget and public site key have been added to the static page. Email confirmation and Netlify's function rate limits remain active without Turnstile.

## Current reward ladder

- 1 verified referral: Founding Member badge
- 3 verified referrals: Priority early access
- 5 verified referrals: First-drop access
- 50 verified referrals: $10 launch credit

Only confirmed email addresses increase a member's referral total.
