import { hashToken, json } from "./_lib/core.mjs";
import { getSupabaseAdmin } from "./_lib/server.mjs";

export default async function handler(request) {
  try {
    const { token } = await request.json();
    if (!token || String(token).length > 200) {
      return json({ ok: false, error: "Invalid dashboard link." }, 401);
    }

    const db = getSupabaseAdmin();
    const { data, error } = await db.rpc("get_waitlist_status", {
      p_dashboard_token_hash: hashToken(token)
    });
    if (error) throw error;

    const status = Array.isArray(data) ? data[0] : data;
    if (!status) {
      return json({ ok: false, error: "This dashboard link is no longer valid." }, 401);
    }

    // Only return the fields a member's dashboard needs. Overall signup and
    // verification totals remain private in Supabase.
    const memberStatus = {
      first_name: status.first_name,
      referral_code: status.referral_code,
      verified_referrals: status.verified_referrals,
      rank_position: status.rank_position
    };

    return json({ ok: true, status: memberStatus });
  } catch (error) {
    console.error("waitlist-status", error?.message || error);
    return json({ ok: false, error: "We could not load your referral status." }, 500);
  }
}

export const config = {
  path: "/api/waitlist/status",
  method: "POST",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["domain", "ip"],
    windowLimit: 30,
    windowSize: 60
  }
};
