import {
  cleanFirstName,
  cleanReferralCode,
  createToken,
  hashToken,
  isValidEmail,
  json,
  normalizeEmail,
  safeAttribution
} from "./_lib/core.mjs";
import {
  getSiteUrl,
  getSupabaseAdmin,
  getWaitlistPageUrl,
  sendConfirmationEmail,
  sendDashboardEmail,
  verifyTurnstile
} from "./_lib/server.mjs";

const genericSuccess = {
  ok: true,
  message: "Check your email to confirm your place and open your referral dashboard."
};

function wasSentRecently(timestamp) {
  if (!timestamp) return false;
  return Date.now() - new Date(timestamp).getTime() < 5 * 60 * 1000;
}

export default async function handler(request, context) {
  try {
    const input = await request.json();

    // Honeypot. Bots that fill hidden fields get a harmless success response.
    if (input.website) return json(genericSuccess);

    const email = normalizeEmail(input.email);
    const firstName = cleanFirstName(input.firstName);
    const referralCode = cleanReferralCode(input.ref);

    if (!isValidEmail(email)) return json({ ok: false, error: "Enter a valid email address." }, 400);
    if (!input.consent) return json({ ok: false, error: "Consent is required to join the waitlist." }, 400);

    const human = await verifyTurnstile(input.turnstileToken, context?.ip);
    if (!human) return json({ ok: false, error: "Please complete the security check and try again." }, 400);

    const db = getSupabaseAdmin();
    const { data: existing, error: existingError } = await db
      .from("waitlist_members")
      .select("id,email,first_name,verified_at,last_confirmation_sent_at")
      .eq("email_normalized", email)
      .maybeSingle();

    if (existingError) throw existingError;
    if (existing && wasSentRecently(existing.last_confirmation_sent_at)) return json(genericSuccess);

    if (existing?.verified_at) {
      const dashboardToken = createToken();
      const { error: updateError } = await db
        .from("waitlist_members")
        .update({
          dashboard_token_hash: hashToken(dashboardToken),
          last_confirmation_sent_at: new Date().toISOString()
        })
        .eq("id", existing.id);
      if (updateError) throw updateError;

      try {
        await sendDashboardEmail({
          email,
          firstName: existing.first_name || firstName,
          dashboardUrl: `${getWaitlistPageUrl()}#waitlist=${dashboardToken}`
        });
      } catch (error) {
        await db.from("waitlist_members").update({ last_confirmation_sent_at: null }).eq("id", existing.id);
        throw error;
      }
      return json(genericSuccess);
    }

    let referrerId = null;
    if (referralCode) {
      const { data: referrer } = await db
        .from("waitlist_members")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();
      referrerId = referrer?.id || null;
    }

    const verificationToken = createToken();
    const verificationTokenHash = hashToken(verificationToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    let memberId = existing?.id;

    if (existing) {
      const { error: updateError } = await db
        .from("waitlist_members")
        .update({
          first_name: existing.first_name || firstName || null,
          verification_token_hash: verificationTokenHash,
          verification_expires_at: expiresAt,
          last_confirmation_sent_at: now,
          consent_at: now
        })
        .eq("id", existing.id);
      if (updateError) throw updateError;
    } else {
      const { data: created, error: insertError } = await db
        .from("waitlist_members")
        .insert({
          email,
          first_name: firstName || null,
          referred_by: referrerId,
          source: String(input.source || "website").slice(0, 80),
          attribution: safeAttribution(input.attribution),
          consent_at: now,
          verification_token_hash: verificationTokenHash,
          verification_expires_at: expiresAt,
          last_confirmation_sent_at: now
        })
        .select("id")
        .single();
      if (insertError) throw insertError;
      memberId = created.id;
    }

    try {
      await sendConfirmationEmail({
        email,
        firstName,
        confirmationUrl: `${getSiteUrl()}/api/waitlist/confirm?token=${encodeURIComponent(verificationToken)}`
      });
    } catch (error) {
      await db.from("waitlist_members").update({ last_confirmation_sent_at: null }).eq("id", memberId);
      throw error;
    }

    return json(genericSuccess, 201);
  } catch (error) {
    console.error("waitlist-signup", error?.message || error);
    return json({ ok: false, error: "We could not add you right now. Please try again shortly." }, 500);
  }
}

export const config = {
  path: "/api/waitlist/signup",
  method: "POST",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["domain", "ip"],
    windowLimit: 10,
    windowSize: 60
  }
};
