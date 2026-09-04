import crypto from "crypto";

const [method = "POST", path = "/api/v1/launch", timestamp, secret, ...bodyParts] =
  process.argv.slice(2);

if (!timestamp || !secret || bodyParts.length === 0) {
  console.log(`Usage:
  node scripts/generate-signature.js POST /api/v1/launch <timestamp> <secret> '<json-body>'

Example:
  node scripts/generate-signature.js POST /api/v1/launch 1725440000 sk_live_test '{"operatorId":"AAKDA-001","playerId":"P1001","gameCode":"TEENPATTI","currency":"INR"}'
`);
  process.exit(1);
}

const rawBody = bodyParts.join(" ");
const payload = `${timestamp}\n${method.toUpperCase()}\n${path}\n${rawBody}`;
const signature = crypto
  .createHmac("sha256", secret)
  .update(payload)
  .digest("hex");

console.log(JSON.stringify({ payload, signature }, null, 2));
