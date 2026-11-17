import fs from 'node:fs';
import { json, jstParts, todayJST, strip } from './util.mjs';
import { applyEvents } from './events-import.mjs';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
/* data/inbox/<kind>/*.json: one record (or an array of records) per file, written by automations (Make → GitHub). Files are read in name order; same handle overrides. */
function inbox(kind) {
  const dir = new URL('../data/inbox/' + kind + '/', import.meta.url);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => { try { return JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')); } catch { console.warn('bad inbox file', kind, f); return null; } }).filter(Boolean).flat();
}
const merge = (base, extra) => { const m = new Map(base.map((x) => [x.handle, x])); for (const x of extra) m.set(x.handle, { ...(m.get(x.handle) || {}), ...x }); return [...m.values()]; };

/* Shopify DRAFT: past events auto-hidden 14+ days after they end stay visible (results history);
   anything set to DRAFT before that (removed by the operator) is hidden. */
function hiddenDraft(t) {
  if (t.status !== 'DRAFT') return false;
  const end = Date.parse(t.ends_at || t.starts_at), upd = Date.parse(t.updatedAt || '');
  return !(end && upd && upd - end >= 13 * 864e5);
}

export const GAME = { '9ball': '9ボール', '10ball': '10ボール', '8ball': '8ボール', '3cushion': 'スリークッション', band: 'バンド', '4ball': '四つ球', snooker: 'スヌーカー', '14-1': '14-1', heyball: 'ヘイボール', 'pocket-other': 'ポケット', other: 'その他' };
export const CLS = { SA: 'SA級', A: 'A級', B: 'B級', C: 'C級', pro: 'プロ', ladies: 'レディース', open: 'オープン', beginner: 'ビギナー', senior: 'シニア', junior: 'ジュニア', student: '学生' };
export const FEAT = { handicap: 'ハンデあり', same_day_entry: '当日受付あり', beginner_welcome: '初心者歓迎', doubles: 'ダブルス', stream: '配信あり', women_welcome: '女性歓迎', free_watch: '観戦無料' };
export const ENTRY = { open: '受付中', closed: '受付終了', cancelled: '中止', postponed: '延期', unknown: '' };
export const ORG = { shop: 'お店', JAPA: 'JAPA', KA3CF: '関東アマ連', JPBA: 'JPBA', NBA: 'NBA', 'NBA-KANTO': 'NBA関東支部', JPBF: 'JPBF', KA3U: 'KA3U', JHBA: '日本HeyBall協会', PBA: 'PBA', JSA: 'JSA', other: '' };
export const DISC = { pocket: { ja: 'ポケット', en: 'POCKET', page: '/pages/pocket' }, carom: { ja: 'キャロム', en: 'CAROM', page: '/pages/carom' }, heyball: { ja: 'ヘイボール', en: 'HEYBALL', page: '/pages/heyball-news' } };
export const REGION = { hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部', kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州・沖縄', overseas: '海外' };

const CAROM_G = new Set(['3cushion', 'band', '4ball']);
const CAROM_ORG = new Set(['KA3CF', 'KA3U', 'NBA', 'NBA-KANTO', 'JPBF']);
export function discOf(games, org) {
  if (games.includes('heyball') || org === 'JHBA') return 'heyball';
  if (games.some((g) => CAROM_G.has(g))) return 'carom';
  if (games.every((g) => g === 'other') && CAROM_ORG.has(org)) return 'carom';
  return 'pocket';
}

export function loadAll() {
  const shopsRaw = merge(read('shops.json'), inbox('shops'));
  const shopById = new Map();
  const shops = shopsRaw.filter((s) => s.status !== 'closed').map((s) => {
    const o = { ...s, tables: json(s.tables), events: json(s.regular_events), url: `/pages/shop/${s.handle}` };
    shopById.set(s.id, o);
    return o;
  });

  const today = todayJST();
  /* the events feed may only add missing events and fill empty results (lib/events-import.mjs) */
  const ev = applyEvents(merge(read('tournaments.json'), inbox('tournaments')), inbox('events'));
  if (ev.report.read) console.log(`events feed: ${ev.report.read} read · ${ev.report.added.length} added · ${ev.report.filled.length} filled · ${ev.report.same.length} unchanged · ${ev.report.skipped.length} skipped` + (ev.report.skipped.length ? '\n  skipped: ' + ev.report.skipped.join(' / ') : '') + (ev.report.added.length ? '\n  added: ' + ev.report.added.join(' / ') : ''));
  const tours = ev.tours.filter((t) => t.starts_at && !hiddenDraft(t)).map((t) => {
    const games = json(t.games), classes = json(t.classes), features = json(t.features);
    const s = jstParts(t.starts_at), e = jstParts(t.ends_at) || s;
    const shop = t.shop ? shopById.get(t.shop) : null;
    const disc = discOf(games, t.organizer);
    return {
      ...t, games, classes, features, s, e, d: s.ymd, end: e.ymd, disc, shop,
      /* 連盟の月例会は公式戦と表記しない（運営者の指示 2026/11/11） */
      cat: t.category === 'official' ? (/月例会/.test(t.title || '') ? 'monthly' : 'official') : t.category === 'event' ? 'event' : 'house',
      url: `/pages/tournament/${t.handle}`,
      upcoming: e.ymd >= today,
      venue: t.venue_name || shop?.name || '',
      pref: t.prefecture || shop?.prefecture || '',
      dead: ['cancelled', 'postponed'].includes(t.entry_status),
    };
  }).sort((a, b) => (a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : 0));
  for (const t of tours) if (t.shop) (t.shop.tours ||= []).push(t);

  const articles = merge(read('articles.json'), inbox('articles')).filter((a) => a.isPublished && a.blog).map((a) => ({
    ...a, title: (a.title || '').replace(/^【公式戦】\s*/, ''), blog: a.blog?.handle || a.blog, blogTitle: a.blog?.title || '', url: `/blogs/${a.blog?.handle || a.blog}/${a.handle}`,
    date: jstParts(a.publishedAt)?.ymd || '', excerpt: strip(a.summary || a.body).slice(0, 140),
  })).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  const pages = Object.fromEntries(read('pages.json').map((p) => [p.handle, p]));
  const products = Object.fromEntries(read('products.json').map((p) => [p.handle, p]));
  let config = {};
  try { config = read('config.json'); } catch {}

  /* players: everyone named in posted results. A win comes from `winner` (or the 🥇 in `results`); 🥈 / 🥉 in the results of non-house events are kept as placings.
     The same person written in different ways is one player: spaces (half / full width) are ignored and variant kanji (髙＝高, 﨑＝崎 …) are folded for matching.
     The page keeps the spelling used most often, and its address is that spelling without spaces. */
  const VAR = { '髙': '高', '﨑': '崎', '濵': '浜', '濱': '浜', '邊': '辺', '邉': '辺', '齋': '斎', '齊': '斉', '澤': '沢', '廣': '広', '德': '徳', '國': '国', '嶋': '島', '嶌': '島', '櫻': '桜', '眞': '真', '惠': '恵', '龍': '竜', '瀨': '瀬', '栁': '柳', '塚': '塚', '吉': '吉' };
  const pkey = (n) => n.normalize('NFKC').replace(/[\s　]/g, '').replace(/./gu, (c) => VAR[c] || c).toLowerCase();
  const person = (raw) => { const n = String(raw || '').replace(/（[^）]*）|\([^)]*\)/g, '').replace(/(選手|プロ|さん)$/, '').replace(/[\s　]+/g, ' ').trim(); const k = n.replace(/\s/g, ''); return k.length < 2 || k.length > 20 || /[0-9０-９]|代表|チーム|ペア|優勝|該当|なし|未定|名$|[＆&×]|[勝敗]$/.test(n) ? '' : n; };
  const bare = (v) => { let x = String(v || ''), y; do { y = x; x = x.replace(/（[^（）]*）|\([^()]*\)/g, ''); } while (x !== y); return x.replace(/[（(].*$/, ''); };
  const split = (v) => { const x = bare(v); return /代表|チーム|アマ連|連盟|支部/.test(x) ? [] : x.split(/[・、,／/]/).map(person).filter(Boolean); };
  const players = new Map();
  const note = (raw, t, rank) => {
    const k = pkey(raw); let p = players.get(k); if (!p) players.set(k, p = { forms: new Map(), recs: [], disc: t.disc });
    if (p.recs.some((r) => r.t === t)) return; p.forms.set(raw, (p.forms.get(raw) || 0) + (rank === '優勝' ? 2 : 1) + (/\s/.test(raw) ? 0.5 : 0)); p.recs.push({ t, rank });
  };
  for (const t of tours) {
    const won = /名$/.test(t.winner || '') ? [] : split(t.winner); for (const n of won) note(n, t, '優勝');
    if (t.cat === 'house' || !t.results) continue;
    for (const part of String(t.results).split(/[／\n]/)) { const m = part.match(/^\s*(?:[^🥇🥈🥉]{0,8}[：:])?\s*(🥇|🥈|🥉)\s*(.+)$/u); if (!m) continue; for (const n of split(m[2])) note(n, t, m[1] === '🥇' ? '優勝' : m[1] === '🥈' ? '準優勝' : '3位'); }
  }
  for (const [k, p] of players) {
    p.name = [...p.forms.entries()].sort((a, b) => b[1] - a[1])[0][0]; p.key = p.name.replace(/\s/g, ''); p.url = `/pages/player/${p.key}`;
    p.recs.sort((a, b) => (a.t.d < b.t.d ? 1 : -1)); p.wins = p.recs.filter((r) => r.rank === '優勝').map((r) => r.t); p.last = p.recs[0].t; delete p.forms;
  }

  return { shops, tours, articles, pages, products, players, config, today, eventsReport: ev.report };
}
