// Our own limits (docs/accounts.md, section 8). Counters are keyed by an HMAC of what they count, so the table never
// holds a raw IP or email address, and are kept two days (api/purge.mjs).
import { createHmac } from 'node:crypto';
import { query } from './db.mjs';

const MIN = 60, HOUR = 3600, DAY = 86400;
export const RULES = {
  codeAddress: [[MIN, 1], [HOUR, 5], [DAY, 10]],
  codeIp: [[HOUR, 10], [DAY, 30]],
  verifyIp: [[HOUR, 30]],
};
export const ALL_CODES = { warn: 60, stop: 95 }; // a day, on Resend's free plan (100 a day)

export function makeLimits({ db, key, now = Date.now }) {
  const q = query(db);
  // count one more of `kind` for `value` in the current window of `seconds`; returns the count
  async function count(kind, value, seconds) {
    const start = new Date(Math.floor(now() / (seconds * 1000)) * seconds * 1000);
    const k = createHmac('sha256', key).update(`${kind}:${seconds}:${value}`).digest('base64url');
    const [row] = await q`insert into limit_counter (key, window_start, n) values (${k}, ${start}, 1)
      on conflict (key, window_start) do update set n = limit_counter.n + 1 returning n`;
    return row.n;
  }
  return {
    count,
    // true when `value` is still within every window of the rule (each call counts as one)
    async allow(rule, value) {
      let ok = true;
      for (const [seconds, max] of RULES[rule]) if (await count(rule, value, seconds) > max) ok = false;
      return ok;
    },
  };
}
