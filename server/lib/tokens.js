const jwt = require('jsonwebtoken');

const secret = () => process.env.JWT_SECRET || process.env.SESSION_SECRET || 'dev-secret';
const ACCESS_TTL = process.env.JWT_ACCESS_TTL || '7d';
const REFRESH_TTL = process.env.JWT_REFRESH_TTL || '30d';

function signAccessToken(user) {
  return jwt.sign({ sub: user.id, tid: user.tenant_id, typ: 'access' }, secret(), { expiresIn: ACCESS_TTL });
}

function signRefreshToken(user) {
  return jwt.sign({ sub: user.id, tid: user.tenant_id, typ: 'refresh' }, secret(), { expiresIn: REFRESH_TTL });
}

function verifyAccessToken(token) {
  const p = jwt.verify(token, secret());
  if (p.typ !== 'access') throw new Error('Not an access token');
  return p;
}

function verifyRefreshToken(token) {
  const p = jwt.verify(token, secret());
  if (p.typ !== 'refresh') throw new Error('Not a refresh token');
  return p;
}

module.exports = { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken, ACCESS_TTL, REFRESH_TTL };
