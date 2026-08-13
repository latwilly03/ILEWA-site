import { createHash, randomBytes } from "node:crypto";

export function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidEmail(value) {
  const email = normalizeEmail(value);
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function cleanFirstName(value) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, 60);
}

export function cleanReferralCode(value) {
  const code = String(value || "").trim().toUpperCase();
  return /^[A-Z0-9]{6,20}$/.test(code) ? code : null;
}

export function createToken() {
  return randomBytes(32).toString("base64url");
}

export function hashToken(value) {
  return createHash("sha256").update(String(value || "")).digest("hex");
}

export function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function safeAttribution(input = {}) {
  const allowed = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
  return Object.fromEntries(
    allowed
      .map((key) => [key, String(input[key] || "").trim().slice(0, 120)])
      .filter(([, value]) => value)
  );
}

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
