import crypto from 'crypto';

/**
 * Casino provider integration (chimera-hub).
 *
 * Env:
 *  PROVIDER_BASE_URL  e.g. https://integration.chimera-hub.com/<partner_code>
 *  OPERATOR_ID        partner code
 *  API_KEY            private api key (Api-Key header)
 *  HOST               provider host (Host header)
 *  LAUNCHER_URL       base launcher url (game launch)
 */

const OP_TYPES = {
  AUTH: '1050', // user authentication / token generation
  PROVIDERS: 1070, // providers list (adjust if provider docs differ)
  GAME_LIST: 1071,
  BALANCE: 2051, // provider -> us: balance api
  CREDIT: 2052, // provider -> us: credit (bet/win) api
};

export const CALLBACK_OP_TYPES = { BALANCE: OP_TYPES.BALANCE, CREDIT: OP_TYPES.CREDIT };

function cfg() {
  const baseUrl = (process.env.PROVIDER_BASE_URL || '').replace(/\/+$/, '');
  const partnerCode = process.env.OPERATOR_ID;
  const apiKey = process.env.API_KEY;
  const host = process.env.HOST;
  if (!baseUrl || !partnerCode || !apiKey) {
    throw new Error('Casino provider env missing: PROVIDER_BASE_URL, OPERATOR_ID, API_KEY');
  }
  return { baseUrl, partnerCode, apiKey, host };
}

/**
 * md5 signature for the auth request.
 * ASSUMPTION: md5(user_id + API_KEY). Adjust to the provider's spec if different.
 */
export function buildMd5(userId) {
  const { apiKey } = cfg();
  return crypto.createHash('md5').update(`${userId}${apiKey}`).digest('hex');
}

async function providerPost(body) {
  const { baseUrl, apiKey, host } = cfg();
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Api-Key': apiKey,
  };
  // Host is normally derived from the URL; only override when explicitly set.
  if (host) headers.Host = host;

  const res = await fetch(baseUrl, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    const err = new Error(`Provider request failed (${res.status})`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

/** Authenticate a user and get a game token. */
export async function authenticateUser({ username, userId, currency = 'INR', closeUrl }) {
  const id = String(userId);
  return providerPost({
    opType: OP_TYPES.AUTH,
    username,
    user_id: id,
    md5: buildMd5(id),
    currency,
    close_url: closeUrl,
  });
}

/** Fetch the providers list. */
export async function getProviders() {
  return providerPost({ opType: OP_TYPES.PROVIDERS });
}

/** Fetch the game list. */
export async function getGameList() {
  return providerPost({ opType: OP_TYPES.GAME_LIST });
}

/** Build the launch URL: LAUNCHER_URL/[partner_code]/launch/[gid]/[token] */
export function buildLaunchUrl(gid, token) {
  const { partnerCode } = cfg();
  const launcher = (process.env.LAUNCHER_URL || '').replace(/\/+$/, '');
  if (!launcher) throw new Error('LAUNCHER_URL env is missing');
  return `${launcher}/${partnerCode}/launch/${encodeURIComponent(gid)}/${encodeURIComponent(token)}`;
}

export default { authenticateUser, getProviders, getGameList, buildLaunchUrl, buildMd5 };
