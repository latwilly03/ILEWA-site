import { createClient } from "@supabase/supabase-js";
import { escapeHtml } from "./core.mjs";

export function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or Supabase server secret.");
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export function getSiteUrl() {
  return String(process.env.SITE_URL || "https://ilewa.world").replace(/\/$/, "");
}

export function getWaitlistPageUrl() {
  return String(process.env.WAITLIST_PAGE_URL || `${getSiteUrl()}/waitlist`).replace(/#.*$/, "");
}

export async function verifyTurnstile(token, remoteIp) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const form = new FormData();
  form.set("secret", secret);
  form.set("response", token);
  if (remoteIp) form.set("remoteip", remoteIp);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body: form
  });
  if (!response.ok) return false;

  const result = await response.json();
  const allowedHostname = process.env.TURNSTILE_ALLOWED_HOSTNAME;
  return Boolean(result.success && (!allowedHostname || result.hostname === allowedHostname));
}

async function sendEmail({ to, subject, html }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Missing RESEND_API_KEY or WAITLIST_FROM_EMAIL.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({ from, to: [to], subject, html })
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Email delivery failed (${response.status}): ${detail.slice(0, 200)}`);
  }
}

function emailShell(content) {
  return `
    <div style="background:#f6f1e8;padding:32px 16px;font-family:Arial,sans-serif;color:#1e1b18">
      <div style="max-width:560px;margin:auto;background:#fff;padding:32px;border-radius:18px">
        <p style="letter-spacing:.16em;font-size:12px;font-weight:700">ILEWA</p>
        ${content}
        <p style="margin-top:28px;color:#6f665d;font-size:13px">You received this because you joined the ILEWA first-access list.</p>
      </div>
    </div>`;
}

export async function sendConfirmationEmail({ email, firstName, confirmationUrl }) {
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Welcome,";
  await sendEmail({
    to: email,
    subject: "Confirm your place on the ILEWA list",
    html: emailShell(`
      <h1 style="font-size:28px;line-height:1.2">${greeting}</h1>
      <p>Confirm your email to secure your place, receive your referral link, and start moving up the list.</p>
      <p style="margin:28px 0"><a href="${escapeHtml(confirmationUrl)}" style="background:#1e1b18;color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Confirm my place</a></p>
      <p style="font-size:13px;color:#6f665d">This link expires in 24 hours.</p>`)
  });
}

export async function sendDashboardEmail({ email, firstName, dashboardUrl }) {
  const greeting = firstName ? `Hi ${escapeHtml(firstName)},` : "Welcome back,";
  await sendEmail({
    to: email,
    subject: "Your ILEWA referral link",
    html: emailShell(`
      <h1 style="font-size:28px;line-height:1.2">${greeting}</h1>
      <p>Open your private dashboard to see your position, referral count, rewards, and share link.</p>
      <p style="margin:28px 0"><a href="${escapeHtml(dashboardUrl)}" style="background:#1e1b18;color:#fff;padding:14px 22px;border-radius:999px;text-decoration:none;font-weight:700">Open my dashboard</a></p>`)
  });
}
