import { useEffect, useMemo, useRef, useState } from "react";
import { nextReward, referralRewards } from "./referralConfig";
import "./referral-waitlist.css";

const TOKEN_KEY = "ilewa_waitlist_dashboard_token";
const REFERRER_KEY = "ilewa_referrer_code";

function getAttribution() {
  const params = new URLSearchParams(window.location.search);
  return Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"]
      .map((key) => [key, params.get(key)])
      .filter(([, value]) => value)
  );
}

function useTurnstile(siteKey) {
  const container = useRef(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey || !container.current) return undefined;
    let widgetId;

    const render = () => {
      if (!window.turnstile || !container.current || widgetId !== undefined) return;
      widgetId = window.turnstile.render(container.current, {
        sitekey: siteKey,
        callback: setToken,
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken("")
      });
    };

    const existing = document.querySelector('script[data-ilewa-turnstile="true"]');
    if (existing) {
      if (window.turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    }
    else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.ilewaTurnstile = "true";
      script.onload = render;
      document.head.appendChild(script);
    }

    return () => {
      if (existing) existing.removeEventListener("load", render);
      if (window.turnstile && widgetId !== undefined) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return { container, token };
}

export default function ReferralWaitlist({
  turnstileSiteKey,
  referralBaseUrl = `${window.location.origin}/`,
  source = "website"
}) {
  const [dashboardToken, setDashboardToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(Boolean(dashboardToken));
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { container: turnstileContainer, token: turnstileToken } = useTurnstile(turnstileSiteKey);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (ref && /^[a-z0-9]{6,20}$/i.test(ref)) localStorage.setItem(REFERRER_KEY, ref.toUpperCase());

    const hash = new URLSearchParams(window.location.hash.slice(1));
    const token = hash.get("waitlist");
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
      setDashboardToken(token);
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  useEffect(() => {
    if (!dashboardToken) return;
    let active = true;
    setLoading(true);
    fetch("/api/waitlist/status", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: dashboardToken })
    })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load your dashboard.");
        return body.status;
      })
      .then((body) => active && setStatus(body))
      .catch((requestError) => {
        if (!active) return;
        localStorage.removeItem(TOKEN_KEY);
        setDashboardToken("");
        setError(requestError.message);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [dashboardToken]);

  const shareUrl = useMemo(() => {
    if (!status?.referral_code) return "";
    const url = new URL(referralBaseUrl);
    url.searchParams.set("ref", status.referral_code);
    return url.toString();
  }, [referralBaseUrl, status]);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const form = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/waitlist/signup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          firstName: form.get("firstName"),
          email: form.get("email"),
          consent: form.get("consent") === "yes",
          website: form.get("website"),
          ref: localStorage.getItem(REFERRER_KEY),
          source,
          attribution: getAttribution(),
          turnstileToken
        })
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Unable to join right now.");
      event.currentTarget.reset();
      setMessage(body.message);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    setMessage("Referral link copied.");
  }

  if (loading) return <section className="ilewa-waitlist"><p>Loading your place...</p></section>;

  if (status) {
    const referrals = Number(status.verified_referrals || 0);
    const upcoming = nextReward(referrals);
    const shareText = "Join me on ILEWA, the destination for discovering and shopping beauty from across the African diaspora.";

    return (
      <section className="ilewa-waitlist ilewa-dashboard">
        <p className="ilewa-eyebrow">ILEWA FOUNDING MEMBERS</p>
        <h1>{status.first_name ? `${status.first_name}, you’re in.` : "You’re in."}</h1>
        <div className="ilewa-stat-grid">
          <div><strong>#{status.rank_position}</strong><span>Your position</span></div>
          <div><strong>{referrals}</strong><span>Verified referrals</span></div>
          <div><strong>{status.total_verified}</strong><span>Verified members</span></div>
        </div>

        <div className="ilewa-share-card">
          <h2>Move up the list</h2>
          <p>Every friend who confirms their email moves you ahead of members with fewer referrals.</p>
          <div className="ilewa-link-row"><input readOnly value={shareUrl} aria-label="Your referral link" /><button onClick={copyLink}>Copy</button></div>
          <div className="ilewa-share-buttons">
            <a href={`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer">X</a>
            <a href={`mailto:?subject=${encodeURIComponent("Join ILEWA with me")}&body=${encodeURIComponent(`${shareText}\n\n${shareUrl}`)}`}>Email</a>
          </div>
        </div>

        <div className="ilewa-rewards">
          <h2>Founding-member rewards</h2>
          {referralRewards.map((reward) => (
            <div className={referrals >= reward.referrals ? "earned" : ""} key={reward.referrals}>
              <span>{referrals >= reward.referrals ? "✓" : reward.referrals}</span>
              <p><strong>{reward.name}</strong><small>{reward.referrals} verified referral{reward.referrals === 1 ? "" : "s"}</small></p>
            </div>
          ))}
          {upcoming && <p className="ilewa-next">Refer {upcoming.referrals - referrals} more to unlock {upcoming.name}.</p>}
        </div>
        {message && <p className="ilewa-success" role="status">{message}</p>}
      </section>
    );
  }

  return (
    <section className="ilewa-waitlist">
      <p className="ilewa-eyebrow">FIRST ACCESS</p>
      <h1>Discover African and diaspora beauty. Shop it in one place.</h1>
      <p className="ilewa-intro">Join ILEWA’s founding-member list for early access to brand drops, rewards, and a simpler way to shop across independent brands.</p>
      <form onSubmit={submit}>
        <label>First name<input name="firstName" autoComplete="given-name" maxLength="60" /></label>
        <label>Email address<input name="email" type="email" autoComplete="email" required /></label>
        <label className="ilewa-consent"><input name="consent" value="yes" type="checkbox" required /> <span>I agree to receive ILEWA waitlist and launch emails. I can unsubscribe at any time.</span></label>
        <label className="ilewa-honeypot" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off" /></label>
        {turnstileSiteKey && <div ref={turnstileContainer} className="ilewa-turnstile" />}
        <button className="ilewa-primary" disabled={submitting || Boolean(turnstileSiteKey && !turnstileToken)}>{submitting ? "Joining..." : "Join first access"}</button>
      </form>
      <p className="ilewa-fine-print">Already joined? Enter the same email and we’ll send a fresh dashboard link.</p>
      {message && <p className="ilewa-success" role="status">{message}</p>}
      {error && <p className="ilewa-error" role="alert">{error}</p>}
    </section>
  );
}
