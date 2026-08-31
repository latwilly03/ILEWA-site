import { createClient } from "@supabase/supabase-js";
import { escapeHtml } from "./core.mjs";

const OJUJU_EMAIL_ASSETS = [
  {
    content: "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",
    filename: "ilewa-ojuju.png",
    content_id: "ilewa-ojuju"
  },
  {
    content: "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",
    filename: "make-it-official-ojuju.png",
    content_id: "make-it-official-ojuju"
  },
  {
    content: "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",
    filename: "waitlist-perk-ojuju.png",
    content_id: "waitlist-perk-ojuju"
  }
];

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

async function sendEmail({ to, subject, html, attachments = [] }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.WAITLIST_FROM_EMAIL;
  if (!apiKey || !from) throw new Error("Missing RESEND_API_KEY or WAITLIST_FROM_EMAIL.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      ...(attachments.length ? { attachments } : {})
    })
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
              <img src="cid:ilewa-ojuju" width="188" alt="ILEWA" style="display:block; width:188px; max-width:100%; height:auto; margin:0 auto;" />
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="center" style="background-color:#7A0C2E; padding:20px 42px 44px 42px;">
              <p style="margin:0 0 13px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:12px; line-height:1.4; font-weight:700; letter-spacing:3px; text-transform:uppercase; color:#C1DDB5;">
                First Access List
              </p>
              <img src="cid:make-it-official-ojuju" width="461" alt="Make it official." style="display:block; width:100%; max-width:461px; height:auto; margin:0 auto 17px auto;" />
              <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:17px; line-height:1.65; color:#F3FAF0;">
                You&rsquo;re one click away from your place in the beautiful home we&rsquo;re building for Black-owned beauty discovery.
              </p>
            </td>
          </tr>

          <tr>
            <td class="mobile-pad" align="left" style="padding:34px 38px 10px 38px;">
              <p style="margin:0 0 14px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:21px; line-height:1.25; font-weight:700; color:#7A0C2E;">
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
                          <p style="margin:0 0 6px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:20px; line-height:1; font-weight:700; color:#7A0C2E;">01</p>
                          <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.45; font-weight:700; color:#3D2028;">Secure your place</p>
                        </td>
                        <td class="step-spacer" width="3.5%" style="width:3.5%;">&nbsp;</td>
                        <td class="step-cell" width="31%" valign="top" style="width:31%; background-color:#FFFFFF; border-radius:10px; padding:15px 12px;">
                          <p style="margin:0 0 6px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:20px; line-height:1; font-weight:700; color:#7A0C2E;">02</p>
                          <p style="margin:0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:13px; line-height:1.45; font-weight:700; color:#3D2028;">Open your dashboard</p>
                        </td>
                        <td class="step-spacer" width="3.5%" style="width:3.5%;">&nbsp;</td>
                        <td class="step-cell" width="31%" valign="top" style="width:31%; background-color:#FFFFFF; border-radius:10px; padding:15px 12px;">
                          <p style="margin:0 0 6px 0; font-family:'Lato',Helvetica,Arial,sans-serif; font-size:20px; line-height:1; font-weight:700; color:#7A0C2E;">03</p>
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
                    <img src="cid:waitlist-perk-ojuju" width="429" alt="48 hours early, plus 15% off your first order." style="display:block; width:100%; max-width:429px; height:auto; margin:0 0 12px 0;" />
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
    html: confirmationEmailHtml({ firstName, confirmationUrl }),
    attachments: OJUJU_EMAIL_ASSETS
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
