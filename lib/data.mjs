import fs from 'node:fs';
import { json, jstParts, todayJST, strip } from './util.mjs';

const read = (f) => JSON.parse(fs.readFileSync(new URL('../data/' + f, import.meta.url), 'utf8'));
/* data/inbox/<kind>/*.json: one record per file, written by automations (Make → GitHub). Same handle overrides. */
function inbox(kind) {
  const dir = new URL('../data/inbox/' + kind + '/', import.meta.url);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort().map((f) => { try { return JSON.parse(fs.readFileSync(new URL(f, dir), 'utf8')); } catch { console.warn('bad inbox file', kind, f); return null; } }).filter(Boolean);
}
const merge = (base, extra) => { const m = new Map(base.map((x) => [x.handle, x])); for (const x of extra) m.set(x.handle, { ...(m.get(x.handle) || {}), ...x }); return [...m.values()]; };

export const GAME = { '9ball': '9ボール', '10ball': '10ボール', '8ball': '8ボール', '3cushion': 'スリークッション', band: 'バンド', '4ball': '四つ球', snooker: 'スヌーカー', '14-1': '14-1', heyball: 'ヘイボール', 'pocket-other': 'ポケット', other: 'その他' };
export const CLS = { SA: 'SA級', A: 'A級', B: 'B級', C: 'C級', pro: 'プロ', ladies: 'レディース', open: 'オープン', beginner: 'ビギナー', senior: 'シニア', junior: 'ジュニア', student: '学生' };
export const FEAT = { handicap: 'ハンデあり', same_day_entry: '当日受付あり', beginner_welcome: '初心者歓迎', doubles: 'ダブルス', stream: '配信あり', women_welcome: '女性歓迎', free_watch: '観戦無料' };
export const ENTRY = { open: '受付中', closed: '受付終了', cancelled: '中止', postponed: '延期', unknown: '' };
export const ORG = { shop: 'お店', JAPA: 'JAPA', KA3CF: '関東アマ連', JPBA: 'JPBA', NBA: 'NBA', 'NBA-KANTO': 'NBA関東', JPBF: 'JPBF', KA3U: 'KA3U', JHBA: '日本HeyBall協会', PBA: 'PBA', JSA: 'JSA', other: '' };
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
  const tours = merge(read('tournaments.json'), inbox('tournaments')).filter((t) => t.starts_at && t.status !== 'DRAFT').map((t) => {
    const games = json(t.games), classes = json(t.classes), features = json(t.features);
    const s = jstParts(t.starts_at), e = jstParts(t.ends_at) || s;
    const shop = t.shop ? shopById.get(t.shop) : null;
    const disc = discOf(games, t.organizer);
    return {
      ...t, games, classes, features, s, e, d: s.ymd, end: e.ymd, disc, shop,
      cat: t.category === 'official' ? 'official' : t.category === 'event' ? 'event' : 'house',
      url: `/pages/tournament/${t.handle}`,
      upcoming: e.ymd >= today,
      venue: t.venue_name || shop?.name || '',
      pref: t.prefecture || shop?.prefecture || '',
      dead: ['cancelled', 'postponed'].includes(t.entry_status),
    };
  }).sort((a, b) => (a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : 0));
  for (const t of tours) if (t.shop) (t.shop.tours ||= []).push(t);

  const articles = merge(read('articles.json'), inbox('articles')).filter((a) => a.isPublished && a.blog).map((a) => ({
    ...a, blog: a.blog?.handle || a.blog, blogTitle: a.blog?.title || '', url: `/blogs/${a.blog?.handle || a.blog}/${a.handle}`,
    date: jstParts(a.publishedAt)?.ymd || '', excerpt: strip(a.summary || a.body).slice(0, 140),
  })).sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));

  const pages = Object.fromEntries(read('pages.json').map((p) => [p.handle, p]));
  const products = Object.fromEntries(read('products.json').map((p) => [p.handle, p]));
  let config = {};
  try { config = read('config.json'); } catch {}

  /* players: winners of single-player events, built from posted results */
  const players = new Map();
  for (const t of tours) {
    if (!t.winner || /[・、,／/]/.test(t.winner) || /名$/.test(t.winner)) continue;
    const name = t.winner.replace(/\s+/g, ' ').trim();
    if (name.length < 2 || name.length > 12) continue;
    const key = name.replace(/\s/g, '');
    if (!players.has(key)) players.set(key, { name, key, url: `/pages/player/${key}`, wins: [], disc: t.disc });
    players.get(key).wins.push(t);
  }
  for (const p of players.values()) p.wins.sort((a, b) => (a.d < b.d ? 1 : -1));

  return { shops, tours, articles, pages, products, players, config, today };
}
