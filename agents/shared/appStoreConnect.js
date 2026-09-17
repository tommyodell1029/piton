// Minimal App Store Connect API client (JWT auth using Node's built-in
// crypto — no extra dependencies). Docs:
// https://developer.apple.com/documentation/appstoreconnectapi

import crypto from "node:crypto";

const ISSUER_ID = process.env.APP_STORE_CONNECT_ISSUER_ID;
const KEY_ID = process.env.APP_STORE_CONNECT_KEY_ID;
const PRIVATE_KEY = process.env.APP_STORE_CONNECT_PRIVATE_KEY; // PEM, .p8 contents
const APP_ID = process.env.APP_STORE_CONNECT_APP_ID;

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function signToken() {
  const header = { alg: "ES256", kid: KEY_ID, typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: ISSUER_ID,
    iat: now,
    exp: now + 60 * 19, // Apple caps tokens at 20 minutes
    aud: "appstoreconnect-v1",
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto
    .createSign("SHA256")
    .update(signingInput)
    .sign({ key: PRIVATE_KEY, dsaEncoding: "ieee-p1363" });

  return `${signingInput}.${base64url(signature).replace(/=+$/, "")}`;
}

export function isAppStoreConnectConfigured() {
  return Boolean(ISSUER_ID && KEY_ID && PRIVATE_KEY && APP_ID);
}

/** Fetches the most recent customer reviews for the configured app. */
export async function fetchAppStoreReviews({ limit = 50 } = {}) {
  if (!isAppStoreConnectConfigured()) {
    return { configured: false, reviews: [] };
  }

  const token = signToken();
  const res = await fetch(
    `https://api.appstoreconnect.apple.com/v1/apps/${APP_ID}/customerReviews?limit=${limit}&sort=-createdDate`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    throw new Error(`App Store Connect API error: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  return {
    configured: true,
    reviews: (data.data ?? []).map((r) => ({
      id: r.id,
      rating: r.attributes.rating,
      title: r.attributes.title,
      body: r.attributes.body,
      createdAt: r.attributes.createdDate,
      territory: r.attributes.territory,
    })),
  };
}
