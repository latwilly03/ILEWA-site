import { createToken, hashToken } from "./_lib/core.mjs";
import { getSupabaseAdmin, getWaitlistPageUrl } from "./_lib/server.mjs";

function redirect(location) {
  return new Response(null, {
    status: 302,
    headers: { location, "cache-control": "no-store" }
  });
}

export default async function handler(request) {
  const page = getWaitlistPageUrl();
  try {
    const token = new URL(request.url).searchParams.get("token");
    if (!token || token.length > 200) return redirect(`${page}?waitlist_error=invalid-link`);

    const db = getSupabaseAdmin();
    const { data: member, error: findError } = await db
      .from("waitlist_members")
      .select("id,verified_at,verification_expires_at")
      .eq("verification_token_hash", hashToken(token))
      .maybeSingle();

    if (findError) throw findError;
    if (!member || new Date(member.verification_expires_at).getTime() < Date.now()) {
      return redirect(`${page}?waitlist_error=expired-link`);
    }

    const dashboardToken = createToken();
    const { error: updateError } = await db
      .from("waitlist_members")
      .update({
        verified_at: member.verified_at || new Date().toISOString(),
        verification_token_hash: null,
        verification_expires_at: null,
        dashboard_token_hash: hashToken(dashboardToken)
      })
      .eq("id", member.id);
    if (updateError) throw updateError;

    return redirect(`${page}#waitlist=${dashboardToken}`);
  } catch (error) {
    console.error("waitlist-confirm", error?.message || error);
    return redirect(`${page}?waitlist_error=server-error`);
  }
}

export const config = {
  path: "/api/waitlist/confirm",
  method: "GET",
  rateLimit: {
    action: "rate_limit",
    aggregateBy: ["domain", "ip"],
    windowLimit: 30,
    windowSize: 60
  }
};
