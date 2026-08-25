const platformTokenUrl = "https://platform.ringcentral.com/restapi/oauth/token";
const ringCxTokenUrl = "https://engage.ringcentral.com/api/auth/login/rc/accesstoken";

export async function getToken(): Promise<string> {
  const clientId = Bun.env.RINGCENTRAL_CLIENT_ID;
  const clientSecret = Bun.env.RINGCENTRAL_CLIENT_SECRET;
  const jwt = Bun.env.RINGCENTRAL_JWT;
  if (!clientId || !clientSecret || !jwt) {
    throw new Error("Missing required environment variables: RINGCENTRAL_CLIENT_ID, RINGCENTRAL_CLIENT_SECRET, RINGCENTRAL_JWT");
  }

  const basicAuth = btoa(`${clientId}:${clientSecret}`);
  const platformResponse = await fetch(platformTokenUrl, {
    method: "POST",
    headers: { Authorization: `Basic ${basicAuth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  const platformBody = await platformResponse.text();
  const platformJson = JSON.parse(platformBody) as { access_token?: string };
  if (!platformResponse.ok || !platformJson.access_token) {
    throw new Error(`Failed to get RingCentral token: ${platformBody}`);
  }
  console.error("✅ RingCentral token received");

  const ringCxResponse = await fetch(ringCxTokenUrl, {
    method: "POST",
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ rcTokenType: "Bearer", rcAccessToken: platformJson.access_token }),
  });
  const ringCxBody = await ringCxResponse.text();
  const ringCxJson = JSON.parse(ringCxBody) as { accessToken?: string };
  if (!ringCxResponse.ok || !ringCxJson.accessToken) {
    throw new Error(`Failed to get RingCX token: ${ringCxBody}`);
  }
  console.error("✅ RingCX token received");
  return ringCxJson.accessToken;
}

export async function promptToken(): Promise<string> {
  const token = prompt("🔑 Enter Bearer token:")?.trim();
  if (!token) throw new Error("No token entered, exiting");
  return token;
}
