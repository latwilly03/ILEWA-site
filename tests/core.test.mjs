import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanFirstName,
  cleanReferralCode,
  createToken,
  hashToken,
  isValidEmail,
  normalizeEmail,
  safeAttribution
} from "../netlify/functions/_lib/core.mjs";

test("normalizes and validates email addresses", () => {
  assert.equal(normalizeEmail("  Founder@ILEWA.World "), "founder@ilewa.world");
  assert.equal(isValidEmail("Founder@ILEWA.World"), true);
  assert.equal(isValidEmail("not-an-email"), false);
});

test("cleans names and referral codes", () => {
  assert.equal(cleanFirstName("  Latifah   Williams "), "Latifah Williams");
  assert.equal(cleanReferralCode(" ab12cd34 "), "AB12CD34");
  assert.equal(cleanReferralCode("bad-code!"), null);
});

test("creates opaque tokens and deterministic hashes", () => {
  const token = createToken();
  assert.ok(token.length >= 40);
  assert.equal(hashToken(token), hashToken(token));
  assert.notEqual(hashToken(token), token);
});

test("only retains permitted attribution fields", () => {
  assert.deepEqual(safeAttribution({ utm_source: "instagram", password: "nope" }), {
    utm_source: "instagram"
  });
});
