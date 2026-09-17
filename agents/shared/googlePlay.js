// Minimal Google Play Developer API client for fetching reviews, using a
// service account JSON (RS256 JWT bearer flow) with Node's built-in crypto.
// Docs: https://developers.google.com/android-publisher/api-ref/rest/v3/reviews/list

import crypto from "node:crypto";

const SERVICE_ACCOUNT_JSON = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
const PACKAGE_NAME = process.env.GOOGLE_PLAY_PACKAGE_NAME ?? "com.piton.app";

function base64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function getAccessToken(serviceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = crypto.createSign("RSA-SHA256").update(signingInput).sign(serviceAccount.private_key);
  const assertion = `${signingInput}.${base64url(signature)}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!res.ok) throw new Error(`Google OAuth token error: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.access_token;
}

export function isGooglePlayConfigured() {
  return Boolean(SERVICE_ACCOUNT_JSON);
}

export async function fetchGooglePlayReviews({ maxResults = 50 } = {}) {
  if (!isGooglePlayConfigured()) {
    return { configured: false, reviews: [] };
  }

  const serviceAccount = JSON.parse(SERVICE_ACCOUNT_JSON);
  const accessToken = await getAccessToken(serviceAccount);

  const res = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/reviews?maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );

  if (!res.ok) throw new Error(`Google Play API error: ${res.status} ${await res.text()}`);
  const data = await res.json();

  return {
    configured: true,
    reviews: (data.reviews ?? []).map((r) => {
      const comment = r.comments?.[0]?.userComment;
      return {
        id: r.reviewId,
        rating: comment?.starRating,
        body: comment?.text,
        createdAt: comment?.lastModified?.seconds
          ? new Date(Number(comment.lastModified.seconds) * 1000).toISOString()
          : null,
        device: comment?.deviceMetadata?.productName,
      };
    }),
  };
}
