/**
 * Alien JWT verification.
 * Uses @alien_org/auth-client if available, else jose + JWKS.
 * JWKS: https://sso.alien-api.com/oauth/jwks
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';

const JWKS_URL = 'https://sso.alien-api.com/oauth/jwks';
let jwks;

async function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL));
  return jwks;
}

async function verifyTokenWithJose(token) {
  const keySet = await getJwks();
  const { payload } = await jwtVerify(token, keySet);
  return { sub: payload.sub, exp: payload.exp, iat: payload.iat };
}

export async function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');

  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  try {
    const tokenInfo = await verifyTokenWithJose(token);
    req.alienId = tokenInfo.sub;
    req.tokenExp = tokenInfo.exp;
    req.tokenIat = tokenInfo.iat;
    next();
  } catch (err) {
    if (err?.code === 'ERR_JWT_EXPIRED') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
}
