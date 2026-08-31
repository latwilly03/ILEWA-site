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

export function confirmationEmailHtml({ firstName, confirmationUrl, waitlistCode = process.env.WAITLIST_CODE || "ILEWA15" }) {
  const safeName = firstName ? escapeHtml(firstName) : "there";
  const safeConfirmationUrl = escapeHtml(confirmationUrl);
  const safeWaitlistCode = escapeHtml(waitlistCode);

  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="x-apple-disable-message-reformatting" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light only" />
  <title>Confirm your place on the ILEWA list</title>
  <!--[if !mso]><!-->
  <link href="https://fonts.googleapis.com/css2?family=Ojuju:wght@400;600;700&amp;family=Lato:wght@400;700&amp;display=swap" rel="stylesheet" type="text/css" />
  <!--<![endif]-->
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Ojuju:wght@400;600;700&family=Lato:wght@400;700&display=swap');
    body, table, td, a { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
    table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; }
    table { border-collapse:collapse !important; }
    img { -ms-interpolation-mode:bicubic; border:0; outline:none; text-decoration:none; }
    body { margin:0 !important; padding:0 !important; width:100% !important; }
    a { color:#7A0C2E; }
    @media screen and (max-width:620px) {
      .email-wrap { width:100% !important; }
      .mobile-pad { padding-left:22px !important; padding-right:22px !important; }
      .hero-title { font-size:40px !important; letter-spacing:1px !important; }
      .logo { font-size:36px !important; letter-spacing:8px !important; text-indent:8px !important; }
      .step-cell { display:block !important; width:100% !important; }
      .step-spacer { display:block !important; width:100% !important; height:10px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#E5F5E4;">
  <div style="display:none; font-size:1px; color:#E5F5E4; line-height:1px; max-height:0; max-width:0; opacity:0; overflow:hidden;">
    One click secures your place and unlocks your private ILEWA referral dashboard.
    &#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;&#8199;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#E5F5E4;">
    <tr>
      <td align="center" style="padding:28px 12px 40px 12px;">
        <table role="presentation" class="email-wrap" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px; background-color:#FFFFFF; border-radius:18px; overflow:hidden;">
          <tr>
            <td align="center" style="background-color:#7A0C2E; border-radius:18px 18px 0 0; padding:28px 20px 24px 20px;">
              <div class="logo" style="font-family:'Ojuju','Trebuchet MS',Verdana,sans-serif; font-size:46px; line-height:1; font-weight:700; letter-spacing:11px; text-indent:11px; color:#C1DDB5;">
                ILEWA
              </div>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" style="background-color:#7A0C2E; padding:20px 42px 44px 42px;">
              <p style="margin:0 0 13px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#C1DDB5;">
                First Access List
              </p>
              <h1 class="hero-title" style="margin:0 0 17px 0; font-family:'Ojuju','Trebuchet MS',Verdana,sans-serif; font-size:50px; line-height:1.02; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#FFFFFF;">
                Make it official.
              </h1>
              <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.65; color:#F3FAF0;">
                You&rsquo;re one click away from your place in the beautiful home we&rsquo;re building for Black-owned beauty discovery.
              </p>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="left" style="padding:34px 38px 10px 38px;">
              <p style="margin:0 0 14px 0; font-family:'Ojuju','Trebuchet MS',Verdana,sans-serif; font-size:26px; line-height:1.25; font-weight:600; color:#7A0C2E;">
                Hi ${safeName},
              </p>
              <p style="margin:0 0 24px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:16px; line-height:1.7; color:#3D2028;">
                Confirm your email to secure your spot on the ILEWA First Access List. Once confirmed, your private dashboard will open so you can share your link, move up the list, and unlock founding-member rewards.
              </p>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="left" style="padding:0 38px 28px 38px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#E5F5E4; border-radius:14px;">
                <tr>
                  <td style="padding:24px 22px;">
                    <p style="margin:0 0 15px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#4E7841;">
                      What your click unlocks
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                      <tr>
                        <td class="step-cell" width="31%" valign="top" style="width:31%; background-color:#FFFFFF; border-radius:10px; padding:15px 12px;">
                          <p style="margin:0 0 6px 0; font-family:'Ojuju','Trebuchet MS',Verdana,sans-serif; font-size:24px; line-height:1; font-weight:700; color:#7A0C2E;">01</p>
                          <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.45; font-weight:700; color:#3D2028;">Secure your place</p>
                        </td>
                        <td class="step-spacer" width="3.5%" style="width:3.5%;">&nbsp;</td>
                        <td class="step-cell" width="31%" valign="top" style="width:31%; background-color:#FFFFFF; border-radius:10px; padding:15px 12px;">
                          <p style="margin:0 0 6px 0; font-family:'Ojuju','Trebuchet MS',Verdana,sans-serif; font-size:24px; line-height:1; font-weight:700; color:#7A0C2E;">02</p>
                          <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.45; font-weight:700; color:#3D2028;">Open your dashboard</p>
                        </td>
                        <td class="step-spacer" width="3.5%" style="width:3.5%;">&nbsp;</td>
                        <td class="step-cell" width="31%" valign="top" style="width:31%; background-color:#FFFFFF; border-radius:10px; padding:15px 12px;">
                          <p style="margin:0 0 6px 0; font-family:'Ojuju','Trebuchet MS',Verdana,sans-serif; font-size:24px; line-height:1; font-weight:700; color:#7A0C2E;">03</p>
                          <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.45; font-weight:700; color:#3D2028;">Share and move up</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" style="padding:0 38px 30px 38px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="background-color:#7A0C2E; border-radius:9px;">
                    <a href="${safeConfirmationUrl}" target="_blank" style="display:inline-block; padding:16px 34px; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:14px; line-height:1.2; font-weight:700; letter-spacing:2px; text-transform:uppercase; color:#FFFFFF; text-decoration:none; border-radius:9px;">
                      Confirm my place
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:15px 0 0 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.6; color:#6D6266;">
                This secure link expires in 24 hours.
              </p>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="left" style="padding:0 38px 28px 38px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; background-color:#6E9A5E; border-radius:14px;">
                <tr>
                  <td style="padding:25px 24px;">
                    <p style="margin:0 0 9px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#E5F5E4;">
                      Your waitlist code
                    </p>
                    <p style="margin:0 0 12px 0; font-family:'Ojuju','Trebuchet MS',Verdana,sans-serif; font-size:27px; line-height:1.25; font-weight:600; color:#FFFFFF;">
                      48 hours early, plus 15% off your first order.
                    </p>
                    <p style="margin:0 0 18px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:14px; line-height:1.65; color:#F2F9F0;">
                      Keep your code somewhere safe. We&rsquo;ll remind you when ILEWA opens.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="background-color:#E5F5E4; border-radius:8px;">
                      <tr>
                        <td style="padding:12px 22px; font-family:'Courier New',Courier,monospace; font-size:18px; line-height:1.2; font-weight:700; letter-spacing:3px; color:#7A0C2E;">
                          ${safeWaitlistCode}
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="left" style="padding:0 38px 30px 38px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;">
                <tr>
                  <td style="border-top:1px solid #C1DDB5; padding-top:22px;">
                    <p style="margin:0 0 7px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.5; font-weight:700; color:#3D2028;">Button not working?</p>
                    <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:11px; line-height:1.55; color:#7A6E73; word-break:break-all;">
                      Copy and paste this link into your browser:<br />
                      <a href="${safeConfirmationUrl}" target="_blank" style="color:#7A0C2E; text-decoration:underline;">${safeConfirmationUrl}</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" style="background-color:#C1DDB5; border-radius:0 0 18px 18px; padding:24px 36px 28px 36px;">
              <p style="margin:0 0 12px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.5; font-weight:700; letter-spacing:2px; text-transform:uppercase;">
                <a href="https://www.instagram.com/ilewa.world/" target="_blank" style="color:#7A0C2E; text-decoration:none;">Instagram</a>
                <span style="color:#4E7841;">&nbsp;&middot;&nbsp;</span>
                <a href="https://www.tiktok.com/@ilewa.world" target="_blank" style="color:#7A0C2E; text-decoration:none;">TikTok</a>
                <span style="color:#4E7841;">&nbsp;&middot;&nbsp;</span>
                <a href="https://ilewa.world" target="_blank" style="color:#7A0C2E; text-decoration:none;">ilewa.world</a>
              </p>
              <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:11px; line-height:1.65; color:#4C5E47;">
                You received this transactional email because you requested to join the ILEWA First Access List.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendConfirmationEmail({ email, firstName, confirmationUrl }) {
  await sendEmail({
    to: email,
    subject: "Confirm your place on the ILEWA list",
    html: confirmationEmailHtml({ firstName, confirmationUrl })
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
