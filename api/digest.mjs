// The weekly digest (docs/accounts.md, step 1b): what a draft may hold, and the email made from it. The draft is
// structured (an opening, sections of linked items, one moment, a closing), never HTML: the email is written here,
// with everything escaped, so nothing typed into the admin page reaches a reader as markup. Links go to our own
// pages only, and carry one utm_source, the same for every reader.
export const SITE = 'https://wherearethey.info';
const LIMITS = { subject: 150, text: 2000, title: 200, line: 600, meta: 80, sections: 6, items: 12 };

const str = (v, max) => (typeof v === 'string' ? v.replace(/\r/g, '').trim().slice(0, max) : '');
// '' for none; null when one is given that isn't a page of ours
function link(v) {
  const s = str(v, 400);
  if (!s) return '';
  try { const u = new URL(s); return u.origin === SITE && !u.username && !u.password ? u.origin + u.pathname + u.search : null; } catch { return null; }
}

// what the admin page sent → { subject, content }, or { error }
export function clean(input) {
  const subject = str(input?.subject, LIMITS.subject).replace(/\n/g, ' '), c = input?.content;
  if (!subject) return { error: 'subject' };
  if (!c || typeof c !== 'object' || Array.isArray(c)) return { error: 'content' };
  let bad = false;
  const url = v => { const l = link(v); if (l === null) bad = true; return l || ''; };
  const sections = (Array.isArray(c.sections) ? c.sections : []).slice(0, LIMITS.sections).map(s => ({
    title: str(s?.title, LIMITS.title).replace(/\n/g, ' '),
    items: (Array.isArray(s?.items) ? s.items : []).slice(0, LIMITS.items)
      .map(i => ({ title: str(i?.title, LIMITS.title).replace(/\n/g, ' '), url: url(i?.url), line: str(i?.line, LIMITS.line), meta: str(i?.meta, LIMITS.meta).replace(/\n/g, ' ') }))
      .filter(i => i.title),
  })).filter(s => s.items.length);
  const m = c.moment && typeof c.moment === 'object' ? { quote: str(c.moment.quote, LIMITS.line), who: str(c.moment.who, LIMITS.title).replace(/\n/g, ' '), url: url(c.moment.url) } : null;
  if (bad) return { error: 'link' };
  return { subject, content: { intro: str(c.intro, LIMITS.text), sections, moment: m?.quote ? m : null, outro: str(c.outro, LIMITS.text) } };
}

const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
const tagged = u => `${u}${u.includes('?') ? '&' : '?'}utm_source=digest&utm_medium=email`;
const paras = t => t.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
export const WHY = 'You get this because you asked for the weekly digest at wherearethey.info.';

// { html, text } for a cleaned draft. {{{RESEND_UNSUBSCRIBE_URL}}} is filled in by Resend for each reader.
export function render({ subject, content: c }) {
  const A = 'color:#0f766e', P = 'margin:0 0 14px';
  const text = [
    ...paras(c.intro).flatMap(p => [p, '']),
    ...c.sections.flatMap(s => [...(s.title ? [s.title.toUpperCase(), ''] : []), ...s.items.flatMap(i => [i.title + (i.meta ? ` (${i.meta})` : ''), ...(i.line ? [i.line] : []), ...(i.url ? [tagged(i.url)] : []), ''])]),
    ...(c.moment ? ['A MOMENT WORTH WATCHING', '', c.moment.quote, ...(c.moment.who ? [c.moment.who] : []), ...(c.moment.url ? [tagged(c.moment.url)] : []), ''] : []),
    ...paras(c.outro).flatMap(p => [p, '']),
    '—', WHY, 'Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}', 'Where Are They · Carlo Pascoli',
  ].join('\n');
  const head = t => `<p style="font-weight:600;margin:26px 0 8px">${esc(t)}</p>`;
  const html = `<div style="font:16px/1.55 -apple-system,Segoe UI,Helvetica,Arial,sans-serif;color:#142027;max-width:600px;margin:0 auto;padding:8px 4px">
<p style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5b6a73;margin:0 0 6px">Where Are They · the week in the record</p>
<p style="font-size:20px;font-weight:600;line-height:1.3;margin:0 0 16px">${esc(subject)}</p>
${paras(c.intro).map(p => `<p style="${P}">${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n')}
${c.sections.map(s => `${s.title ? head(s.title) : ''}
${s.items.map(i => `<p style="${P}">${i.url ? `<a href="${esc(tagged(i.url))}" style="${A};font-weight:600">${esc(i.title)}</a>` : `<b>${esc(i.title)}</b>`}${i.meta ? ` <span style="font-size:13px;color:#5b6a73">${esc(i.meta)}</span>` : ''}${i.line ? `<br>${esc(i.line).replace(/\n/g, '<br>')}` : ''}</p>`).join('\n')}`).join('\n')}
${c.moment ? `${head('A moment worth watching')}
<p style="margin:0 0 14px;padding:2px 0 2px 14px;border-left:3px solid #0f766e">${esc(c.moment.quote)}${c.moment.who ? `<br><span style="font-size:14px;color:#5b6a73">${esc(c.moment.who)}</span>` : ''}${c.moment.url ? `<br><a href="${esc(tagged(c.moment.url))}" style="${A}">Watch it at that point →</a>` : ''}</p>` : ''}
${paras(c.outro).map(p => `<p style="${P}">${esc(p).replace(/\n/g, '<br>')}</p>`).join('\n')}
<p style="font-size:13px;color:#5b6a73;border-top:1px solid #dfe4e2;padding-top:12px;margin-top:26px">${esc(WHY)} <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#5b6a73">Unsubscribe</a> in one click.<br>Where Are They · Carlo Pascoli</p>
</div>`;
  return { html, text };
}
