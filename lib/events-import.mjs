/* data/inbox/events/*.json: the "events_latest.json" feed (an AI-made digest of official announcements), dropped in by Make from Google Drive.
   The feed is NOT trusted to be exact, so it may only (1) add an event the site does not have yet and (2) fill in a result that is still empty.
   It never changes a title, date or venue already on the site, never overwrites an existing result, and never un-hides a hidden (DRAFT) event.
   Items whose "date" is not a real event date (e.g. the day an announcement was published) are never added as new events. */
import crypto from 'node:crypto';

const ORG = { JPBA: 'JPBA', JPBF: 'JPBF', JAPA: 'JAPA', NBA: 'NBA', 'NBA関東': 'NBA-KANTO', 'NBA-KANTO': 'NBA-KANTO', JHBA: 'JHBA', PBA: 'PBA', KA3CF: 'KA3CF', KA3U: 'KA3U', JSA: 'JSA' };
const GAME = { pocket: 'pocket-other', carom: '3cushion', heyball: 'heyball' };
const VAGUE = /参照|未定|未発表|発表|確認|調整中|^$/;
const NOT_A_DATE = /公開|エントリー|案内|発表|募集|受付/;
const norm = (s) => String(s || '').normalize('NFKC').replace(/[（(［\[【][^）)］\]】]*[）)］\]】]/g, '').replace(/アダムジャパン/g, 'ADAMJAPAN').replace(/グランプリウエスト/g, 'グランプリウェスト').replace(/[\s　・･、,.:：/／\-‐－—~〜｜|!！'’"]/g, '').replace(/^20\d\d年?/, '').toLowerCase();
const grams = (s) => { const a = new Set(); for (let i = 0; i < s.length - 1; i++) a.add(s.slice(i, i + 2)); return a; };
function score(a, b) { a = norm(a); b = norm(b); if (a.length < 4 || b.length < 4) return 0; if (a === b) return 1; const [s, l] = a.length <= b.length ? [a, b] : [b, a]; if (l.includes(s) && s.length >= 6) return 0.95; const gs = grams(s), gl = grams(l); let n = 0; for (const g of gs) if (gl.has(g)) n++; return n / gs.size; }
const day = (s) => { const m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) / 864e5 : null; };
const nth = (s) => (String(s || '').normalize('NFKC').match(/第\s*(\d+)\s*[回戦]/g) || []).join('|');
const person = (s) => String(s || '').replace(/[（(].*?[）)]/g, '').replace(/(プロ|選手|さん)$/, '').trim();
function resultText(r) {
  const p = {}; for (const part of String(r).split(/\s*[\/／]\s*/)) { const m = part.match(/^([^：:]+)[：:]\s*(.+)$/); if (m) p[m[1].trim()] = m[2].trim().replace(/、/g, '・'); }
  if (!p['優勝']) return { results: String(r).trim(), winner: null };
  let t = '🥇 ' + p['優勝']; if (p['準優勝']) t += '／🥈 ' + p['準優勝']; const third = p['3位タイ'] || p['3位'] || p['三位タイ'] || p['ベスト4']; if (third) t += '／🥉 ' + third;
  for (const k of Object.keys(p)) if (!/^(優勝|準優勝|3位タイ|3位|三位タイ|ベスト4)$/.test(k)) t += `（${k}：${p[k]}）`;
  const w = person(p['優勝']); return { results: t, winner: /[・、,／/]/.test(w) || w.length < 2 || w.length > 12 ? null : w };
}

export function applyEvents(tours, events) {
  const rep = { read: 0, added: [], filled: [], same: [], skipped: [] };
  const list = tours.map((t) => ({ ...t }));
  for (const e of events) {
    if (!e || typeof e !== 'object' || !e.title) continue; rep.read++;
    const ed = day(e.date), realDate = ed != null && !NOT_A_DATE.test(String(e.date_display || '')) && /\d+月\d+日/.test(String(e.date_display || ''));
    let best = null, bs = 0, bd = 1e9;
    for (const t of list) {
      if (t.category && !/official|event/.test(t.category)) continue;
      const s = score(e.title, t.title); if (s < 0.6) continue;
      const na = nth(e.title), nb = nth(t.title); if (na && nb && na !== nb) continue; /* 第5戦 is not 第6戦 */
      const td = day(t.starts_at), diff = ed != null && td != null ? Math.abs(td - ed) : 1e6;
      const ok = realDate ? (diff <= 3 || (s >= 0.8 && diff <= 10)) : s >= 0.8;
      if (ok && (diff < bd - 0.5 || (Math.abs(diff - bd) <= 0.5 && s > bs))) { best = t; bs = s; bd = diff; }
    }
    const res = e.result_summary && String(e.result_summary).trim() ? resultText(e.result_summary) : null;
    if (best) {
      const did = [];
      if (res && !best.results && !best.winner) { best.results = res.results; if (res.winner) best.winner = res.winner; if (!best.results_url && e.source_url) best.results_url = e.source_url; if (best.entry_status === 'open' || best.entry_status === 'unknown') best.entry_status = 'closed'; did.push('result'); }
      if ((!best.venue_name || VAGUE.test(best.venue_name)) && e.venue && !VAGUE.test(e.venue)) { best.venue_name = String(e.venue).replace(/[（(][^）)]*[都道府県][）)]$/, '').trim(); did.push('venue'); }
      (did.length ? rep.filled : rep.same).push(`${e.title} → ${best.handle}${did.length ? ' [' + did.join(',') + ']' : ''}`);
      continue;
    }
    const org = ORG[String(e.organization || '').toUpperCase()] || ORG[e.organization];
    if (!realDate || !org) { rep.skipped.push(`${e.title}（${!org ? '団体が不明' : '開催日ではない日付'}：${e.date_display || e.date || ''}）`); continue; }
    const pref = (String(e.venue || '').match(/[（(]([^）)]*?[都道府県])[^）)]*[）)]/) || [])[1] || null;
    const t = { handle: `ev-${org.toLowerCase()}-${String(e.date).slice(0, 10).replace(/-/g, '')}-${crypto.createHash('sha1').update(norm(e.title)).digest('hex').slice(0, 8)}`, title: String(e.title).trim(), starts_at: `${String(e.date).slice(0, 10)}T${(String(e.date_display).match(/(\d{1,2}):(\d{2})/) || []).slice(1).map((x) => x.padStart(2, '0')).join(':') || '10:00'}:00+09:00`, ends_at: null,
      date_label: String(e.date_display || '').replace(/^20\d\d年/, '').replace(/月/, '/').replace(/日/, '').replace(/\(/g, '（').replace(/\)/g, '）').trim() || null, category: 'official', organizer: org, shop: null,
      venue_name: e.venue && !VAGUE.test(e.venue) ? String(e.venue).replace(/[（(][^）)]*[都道府県][^）)]*[）)]$/, '').trim() : null, prefecture: pref, city: null, region: null, games: JSON.stringify([GAME[String(e.category || '').toLowerCase()] || 'other']), classes: null, women_only: null, features: null, rank: 'other',
      entry_status: res ? 'closed' : 'unknown', notes: '各団体の発表をもとに自動で掲載しています。くわしくは出典のページをご確認ください。', summary: null, source_url: e.source_url || null, source_name: org, results: res ? res.results : null, winner: res ? res.winner : null, results_url: res ? e.source_url || null : null, source_id: null };
    t.source_id = t.handle; list.push(t); rep.added.push(`${t.title} → ${t.handle}`);
  }
  return { tours: list, report: rep };
}
