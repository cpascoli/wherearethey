// Better Auth, used as a library only: its HTTP handler is never mounted, so the only routes that exist are ours
// (api/app.mjs). It gives us the emailed codes and the sessions (docs/accounts.md, sections 5 and 8).
import { betterAuth } from 'better-auth';
import { emailOTP } from 'better-auth/plugins';

export const SESSION_DAYS = 90;
export const CODE_MINUTES = 10;

// db: a Kysely instance on Postgres. sendCode({ email, code, type }) delivers a code. secure: false only on the dev server.
export function makeAuth({ db, secret, origin, sendCode, secure = true }) {
  return betterAuth({
    database: { db, type: 'postgres' },
    secret,
    baseURL: origin,
    trustedOrigins: [origin],
    rateLimit: { enabled: false }, // ours (api/limits.mjs): Better Auth's doesn't apply to server-side calls
    telemetry: { enabled: false },
    session: { expiresIn: SESSION_DAYS * 86400, updateAge: 86400 }, // rolling; read from the database on every request
    advanced: {
      useSecureCookies: secure,
      // Path=/api keeps the cookie off page loads, the edge functions and anything else on the origin
      defaultCookieAttributes: { path: '/api', sameSite: 'lax', secure, httpOnly: true },
      ipAddress: { disableIpTracking: true },
    },
    // nothing about the device is kept with a session
    databaseHooks: { session: { create: { before: async s => ({ data: { ...s, ipAddress: null, userAgent: null } }) } } },
    plugins: [emailOTP({
      otpLength: 8, expiresIn: CODE_MINUTES * 60, allowedAttempts: 3, storeOTP: 'hashed',
      sendVerificationOTP: ({ email, otp, type }) => sendCode({ email, code: otp, type }),
    })],
  });
}
