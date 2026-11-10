// VIBES BILLIARDS static site builder. `node build.mjs` → dist/
import fs from 'node:fs';
import path from 'node:path';
import { esc, write, copyDir, md, mdJa, ymdJa, wdEn, wdOf, wdJa, addDays, daysBetween, hm, svg, ball, trunc, SITE, LINE_ADD, LINE_ID, EMAIL } from './lib/util.mjs';
import { loadAll, GAME, CLS, FEAT, ENTRY, ORG, DISC } from './lib/data.mjs';
import { page, LANGS, VER } from './lib/layout.mjs';
import { tRow, rRow, nRow, pCard, nextOfficial, oRow, todayBlock, transitBlock, discTiles, shopCta, dayGroup, catBadge, gamesLabel, classLabel, fdot } from './lib/parts.mjs';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(ROOT, 'dist');
const THEME = path.join(ROOT, 'legacy');
fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });
copyDir(path.join(ROOT, 'static'), DIST);

const D = loadAll();
const { tours, shops, articles, pages, players, today, config } = D;
const out = new Map(); // url -> html (Japanese); locale copies are made at the end
const put = (url, html) => out.set(url, typeof html === 'string' ? { html } : html);

const upcoming = tours.filter((t) => t.upcoming);
const official = upcoming.filter((t) => t.cat === 'official' && !t.dead && t.d >= today);
const withResults = tours.filter((t) => (t.winner || t.results) && t.d <= today).sort((a, b) => (a.d < b.d ? 1 : -1));
const byDay = (list) => { const m = new Map(); for (const t of list) { if (!m.has(t.d)) m.set(t.d, []); m.get(t.d).push(t); } return m; };
const blogs = { news: 'NEWS / 大会情報', results: '試合結果', 'house-tournament': 'ハウストーナメント', live: '試合速報' };
const artsOf = (b) => articles.filter((a) => a.blog === b);
const cur = { news: 'n', results: 'r', 'house-tournament': 't', live: 'l' };

/* ================= HOME ================= */
function home() {
  const n1 = official[0], n2 = official[1];
  const days = [...byDay(upcoming.filter((t) => t.d >= today && t.d <= addDays(today, 13))).entries()].slice(0, 7);
  const firstWeekend = days.find(([d]) => [0, 6].includes(wdOf(d)))?.[0] || days[0]?.[0];
  const recentOff = withResults.filter((t) => t.cat === 'official').slice(0, 6);
  const lastDay = recentOff[0]?.d;
  const housePending = tours.filter((t) => t.cat === 'house' && !t.results && !t.winner && t.d < today && t.d >= addDays(today, -7) && !t.dead).length;
  const month = today.slice(0, 7);
  const prevMonth = addDays(month + '-01', -1).slice(0, 7);
  const inMonth = (m) => [...players.values()].filter((p) => p.wins[0].d.startsWith(m)).sort((a, b) => (a.wins[0].d < b.wins[0].d ? 1 : -1));
  let ps = inMonth(month), psLabel = `${+month.slice(5)}月の優勝者`;
  if (!ps.length) { ps = inMonth(prevMonth); psLabel = `${+prevMonth.slice(5)}月の優勝者`; }
  const news = artsOf('news').slice(0, 5);
  const prefs = ['東京都', '神奈川県', '千葉県', '埼玉県', '大阪府', '愛知県', '福岡県', '北海道'];
  const wind = shops.find((s) => s.handle === 'billiard-wind');

  const body = `
<div class="band"><div class="wrap">
<div class="hero">
<div style="display:flex;flex-direction:column;gap:14px">${n1 ? nextOfficial(n1, today, daysBetween(today, n1.d)) : ''}
${n2 ? `<a class="mini-next only-sp" href="${n2.url}"><span class="cal-chip"><b>${+n2.d.slice(8)}</b><small>${+n2.d.slice(5, 7)}月</small></span><span style="min-width:0"><span style="display:block;font-size:11px;font-weight:700;color:var(--lime)">注目 あと${daysBetween(today, n2.d)}日</span><span style="display:block;font-size:14px;font-weight:900;line-height:1.4">${esc(n2.title)}</span><span style="display:block;font-size:11px;color:var(--sub-d)">${esc(n2.venue)}</span></span>${svg('next', 18, '#A3A8B5', 2.4)}</a>` : ''}</div>
<div class="olist">
<span class="only-pc" style="font-size:13px;font-weight:900;color:var(--sub-d)">これからの公式戦</span>
${official.slice(1, 4).map((t) => `<div class="only-pc">${oRow(t, today, daysBetween(today, t.d))}</div>`).join('')}
<a class="btn btn-lime btn-block" href="/pages/tournaments">大会をさがす</a>
</div></div></div></div>

<main class="wrap">
<div class="sec" style="padding-top:20px">
<form class="search-m" action="/pages/tournaments" role="search">${svg('search', 20, '#5B5F6B')}<input type="search" name="q" placeholder="大会・ビリヤード場を検索" aria-label="大会・ビリヤード場を検索"></form>
<div class="quick">${[['/pages/tournaments', '大会', 'cal'], ['/blogs/results', '結果', 'trophy'], ['/blogs/live', '速報', 'camera'], ['/pages/players', '選手', 'user'], ['/pages/near', '近くの店', 'pin'], ['/pages/live-table', 'カウント', 'count'], ['/blogs/news', 'NEWS', 'news'], ['/pages/shaft', 'SHOP', 'bag']].map(([h, l, i]) => `<a href="${h}"><i>${svg(i, 18, '#C0FC09', 2.2)}</i>${l}</a>`).join('')}</div>
</div>

<section class="sec"><div class="sec-h"><h2>今日のビリヤード</h2></div>
<div class="cols eq"><div>${todayBlock()}</div><div>${transitBlock()}</div></div></section>

<section class="sec" data-daytabs><div class="sec-h"><h2>大会カレンダー</h2><a href="/pages/tournaments">すべての大会</a></div>
<div class="days" role="tablist" aria-label="日付">${days.map(([d, l]) => `<button type="button" class="day" role="tab" aria-selected="${d === firstWeekend}" data-day="${d}"><b>${md(d)}</b><small>${wdJa(wdOf(d))}・${l.length}件</small></button>`).join('')}</div>
${days.map(([d, l]) => `<div data-daypanel="${d}"${d === firstWeekend ? '' : ' hidden'}><div class="card list">${l.slice(0, 12).map((t) => tRow(t)).join('')}</div>${l.length > 12 ? `<p style="margin-top:8px"><a href="/pages/tournaments?date=${d}" style="font-size:13px;font-weight:900">この日の大会をすべて見る（${l.length}件）</a></p>` : ''}</div>`).join('')}
<p class="muted" style="font-size:12px">掲載のない大会は、お店からLINEまたは<a href="/pages/tournament-form">掲載フォーム</a>で送れます。</p>
</section>

<section class="sec"><div class="cols">
<div style="display:flex;flex-direction:column;gap:12px"><div class="sec-h"><h2>最新の結果${lastDay ? ` <span class="disp muted" style="font-weight:400">${md(lastDay)}</span>` : ''}</h2><a href="/blogs/results">すべて</a></div>
<div class="card dark list">${recentOff.map(rRow).join('')}<a class="rrow" href="/blogs/live" style="border-bottom:0"><span class="t">ハウストーナメント　結果待ち ${housePending}件</span><span class="w" style="color:var(--sub-d);font-size:12px">お店の方は送信 ›</span></a></div></div>
<div style="display:flex;flex-direction:column;gap:12px"><div class="sec-h"><h2>NEWS</h2><a href="/blogs/news">すべて</a></div><div class="card list">${news.map(nRow).join('')}</div></div>
</div></section>

${ps.length ? `<section class="sec"><div class="sec-h"><h2>${psLabel}</h2><a href="/pages/players">選手一覧</a></div><div class="hscroll">${ps.map(pCard).join('')}</div></section>` : ''}

<section class="sec"><div class="sec-h"><h2>種目から探す</h2></div>${discTiles()}</section>

<section class="sec"><div class="sec-h"><h2>ビリヤード場</h2><a href="/pages/near">地図でさがす</a></div>
<div class="cols eq"><div style="display:flex;flex-direction:column;gap:10px"><div class="chips"><a class="chip" href="/pages/near?auto=1">現在地から探す</a>${prefs.map((p) => `<a class="chip" href="/pages/near?pref=${encodeURIComponent(p)}">${p.replace(/[都府県]$/, '')}</a>`).join('')}<a class="chip" href="/pages/near">すべて</a></div>
${wind ? `<a class="card pad" href="${wind.url}" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;text-decoration:none"><span><span class="badge b-off" style="margin-bottom:6px">デジタルカウント導入店</span><span style="display:block;font-size:16px;font-weight:900">ビリヤードWIND</span><span style="display:block;font-size:12px" class="muted">埼玉県志木市・18:00〜深夜・旋盤あり</span></span>${svg('next', 18, '#5B5F6B', 2.4)}</a>` : ''}</div>
<a class="dc" href="/pages/live-table"><span><span class="cue-pair"><i style="background:#fff"></i>先攻<i style="background:var(--b1);margin-left:6px"></i>後攻</span><span class="en">DIGITAL COUNT</span><span class="tx">スマホが台のスコアボードに。キャロム版・ポケット版、無料。</span></span><span class="go-c">${svg('next', 18, '#171A22', 2.6)}</span></a>
</div></section>

<section class="sec"><div class="sec-h"><h2>はじめての方へ</h2></div><div class="tiles">
<a class="tile lime full" href="/pages/guide" style="display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center"><span><b style="font-size:16px">大会に出てみよう ガイド</b><small style="display:block;color:var(--night)">P・A・B・C級の見方、申し込みから当日まで</small></span><span class="badge b-new">NEW</span></a>
<a class="tile" href="/pages/heyball"><b>HEYBALLとは？</b><small>中国発の新種目</small></a><a class="tile" href="/pages/jpa"><b>JPAとは？</b><small>チームで戦うプールリーグ</small></a>
<a class="tile" href="/pages/kids"><span class="en">KIDS</span><small>子どもと楽しむビリヤード</small></a><a class="tile" href="/pages/nine-drop"><span class="en">NINE DROP</span><small>ナインボールのパズル</small></a>
</div></section>

<section class="sec"><div class="sec-h"><h2>SHOP</h2><a href="/pages/shaft#faq">よくある質問</a></div><div class="tiles">
<a class="tile dark full" href="/pages/shaft"><small>パターンオーダー・税込・送料込・銀行振込</small><b style="font-size:17px">Vibes Carbon Shaft</b><span class="disp" style="font-size:36px;color:var(--lime)">¥25,000</span></a>
<a class="tile" href="/pages/wear"><b>Wear Vibes</b><small>ロゴTシャツ</small></a><a class="tile" href="/pages/shaft#maintenance"><b>メンテナンス</b><small>タップ交換 ¥1,000〜</small></a>
<a class="tile" href="/pages/app"><span class="en">VIBES APP</span><small>ホーム画面に追加</small></a><a class="tile" href="/pages/live-table"><span class="en">COUNT</span><small>デジタルカウント</small></a>
</div></section>

<section class="sec">${shopCta()}</section>
</main>`;
  put('/', page({ path: '/', cur: 'home', body, scripts: `<script src="/js/home.js?v=${VER}" defer></script><script src="/js/transit.js?v=${VER}" defer></script>`, extraHead: '<style>@media(min-width:900px){.only-sp{display:none!important}}@media(max-width:899px){.only-pc{display:none!important}}</style>' }));
}

/* ================= TOURNAMENTS ================= */
const PREFS = '北海道,青森県,岩手県,宮城県,秋田県,山形県,福島県,茨城県,栃木県,群馬県,埼玉県,千葉県,東京都,神奈川県,新潟県,富山県,石川県,福井県,山梨県,長野県,岐阜県,静岡県,愛知県,三重県,滋賀県,京都府,大阪府,兵庫県,奈良県,和歌山県,鳥取県,島根県,岡山県,広島県,山口県,徳島県,香川県,愛媛県,高知県,福岡県,佐賀県,長崎県,熊本県,大分県,宮崎県,鹿児島県,沖縄県'.split(',');
function fRow(t) {
  const attrs = `data-d="${t.d}" data-e="${t.end}" data-p="${esc(t.pref)}" data-g="${t.disc}" data-k="${t.cat}" data-c="${t.classes.join(' ')}" data-w="${t.women_only === 'true' ? 1 : 0}" data-q="${esc((t.title + ' ' + t.venue + ' ' + t.pref + ' ' + (t.city || '')).toLowerCase())}"`;
  return tRow(t, { showDate: true }).replace('<a class="row"', `<a class="row" ${attrs}`);
}
function tournaments() {
  const list = upcoming.filter((t) => t.end >= today);
  const used = new Set(list.map((t) => t.pref).filter(Boolean));
  const body = `
<div class="band"><div class="wrap band-in"><div class="ph"><h1>大会をさがす</h1><p>公式戦とハウストーナメントを、日付・エリア・種目・クラスで絞り込めます。</p></div>
<form class="filters" id="tf" onsubmit="return false">
<select name="date" aria-label="日付"><option value="">日付：すべて</option><option value="today">今日</option><option value="tomorrow">明日</option><option value="weekend">今週末</option><option value="week">7日以内</option><option value="month">30日以内</option></select>
<select name="p" aria-label="エリア"><option value="">エリア：全国</option><option value="kanto">関東（1都6県）</option>${PREFS.filter((p) => used.has(p)).map((p) => `<option>${p}</option>`).join('')}</select>
<select name="g" aria-label="種目"><option value="">種目：すべて</option><option value="pocket">ポケット</option><option value="carom">キャロム</option><option value="heyball">ヘイボール</option></select>
<select name="c" aria-label="クラス"><option value="">クラス：すべて</option>${['SA', 'A', 'B', 'C', 'beginner', 'ladies', 'pro', 'open'].map((c) => `<option value="${c}">${CLS[c]}</option>`).join('')}</select>
<select name="k" aria-label="種別"><option value="">公式戦＋ハウス</option><option value="official">公式戦だけ</option><option value="house">ハウスだけ</option></select>
<input type="hidden" name="q"><input type="hidden" name="w">
<button type="button" class="clr" id="tf-clr">条件をクリア</button>
</form></div></div>
<main class="wrap">
<div class="sec" style="padding-top:18px"><p class="count" id="tf-n" aria-live="polite">${list.length}件</p><p id="tf-q" class="muted" style="font-size:13px" hidden></p>
<div id="tf-list" style="display:flex;flex-direction:column;gap:18px">${[...byDay(list).entries()].map(([d, l]) => `<div class="daygrp" data-grp="${d}"><h3>${mdJa(d)}<small data-grpn>${l.length}件</small></h3><div class="card list">${l.map(fRow).join('')}</div></div>`).join('')}</div>
<div class="empty" id="tf-empty" hidden><b>条件に合う大会がありません。</b><p>条件を減らすか、<a href="/pages/tournaments">すべての大会</a>から探してください。掲載のない大会は<a href="/pages/tournament-form">掲載フォーム</a>から送れます。</p></div>
</div>
<section class="sec"><div class="sec-h"><h2>最近の試合結果</h2><a href="/blogs/results">試合結果</a></div><div class="card dark list">${withResults.slice(0, 8).map(rRow).join('')}</div></section>
<section class="sec">${shopCta()}</section>
</main>`;
  put('/pages/tournaments', page({ title: '大会をさがす', desc: '全国のビリヤード大会（公式戦・ハウストーナメント）を日付・エリア・種目・クラスで検索。', path: '/pages/tournaments', cur: 't', body, scripts: `<script src="/js/tournaments.js?v=${VER}" defer></script>` }));
}

function tDetail(t) {
  const rows = [];
  const add = (k, v) => { if (v) rows.push(`<dt>${k}</dt><dd>${v}</dd>`); };
  const s = t.s, e = t.e;
  let when = t.date_label || `${ymdJa(t.d)} ${hm(s)}`;
  if (t.ends_at && t.end !== t.d) when = `${ymdJa(t.d)}〜${mdJa(t.end)}`;
  add('日程', esc(when));
  add('会場', `${esc(t.venue)}${t.shop ? ` <small><a href="${t.shop.url}">お店のページ</a></small>` : ''}${t.pref || t.city ? `<small>${esc((t.pref || '') + (t.city || ''))}</small>` : ''}`);
  add('種目', esc(gamesLabel(t)));
  add('クラス', esc(classLabel(t)));
  add('主催', esc(ORG[t.organizer] ?? t.organizer ?? ''));
  add('参加費', t.fee_yen ? `¥${Number(t.fee_yen).toLocaleString()}${t.fee_note ? `<small>${esc(t.fee_note)}</small>` : ''}` : esc(t.fee_note || ''));
  add('ハンデ', esc(t.handicap));
  add('形式', esc(t.format));
  add('定員', esc(t.capacity));
  add('申込', `${esc(t.apply_method || '')}${t.apply_url ? `<small><a href="${esc(t.apply_url)}" target="_blank" rel="noopener">申込ページを開く</a></small>` : ''}`);
  if (t.entry_deadline) add('締切', esc(ymdJa(t.entry_deadline.slice(0, 10)) + (t.entry_deadline.slice(11, 16) !== '00:00' ? ' ' + t.entry_deadline.slice(11, 16) : '')));
  add('問い合わせ', esc(t.contact));
  add('備考', esc(t.notes));
  if (t.features.length) add('特徴', esc(t.features.map((f) => FEAT[f] || f).join('・')));
  const flyer = t.source_url && /^\/img\/.+\.(jpe?g|png|webp)$/i.test(t.source_url) ? t.source_url : '';
  if (flyer) add('出典', esc(t.source_name || '大会要項'));
  else if (t.source_url && !/cdn\.shopify\.com/.test(t.source_url)) add('出典', `<a href="${esc(t.source_url)}" target="_blank" rel="noopener">${esc(t.source_name || '大会要項')}</a>`);
  else if (t.source_name) add('出典', esc(t.source_name));
  const same = upcoming.filter((x) => x !== t && x.cat === t.cat && x.disc === t.disc && x.d >= today && !x.dead).slice(0, 5);
  const daysTo = daysBetween(today, t.d);
  const st = ENTRY[t.entry_status];
  const res = t.results ? `<section class="sec"><div class="sec-h"><h2>試合結果</h2></div><div class="card pad prose" style="white-space:pre-line">${esc(t.results)}</div>${t.results_url ? `<a href="${esc(t.results_url)}" target="_blank" rel="noopener" style="font-size:13px;font-weight:900">結果の詳細</a>` : ''}</section>` : '';
  const station = t.shop?.station || '';
  const body = `
<div class="band"><div class="wrap band-in">
<p class="crumb"><a href="/">トップ</a> ／ <a href="/pages/tournaments">大会をさがす</a></p>
<div style="display:flex;gap:6px;flex-wrap:wrap">${catBadge(t)}<span class="badge b-soft">${fdot(t.disc)}&nbsp;${DISC[t.disc].ja}</span>${st && t.entry_status !== 'unknown' ? `<span class="badge ${t.dead ? 'b-closed' : 'b-soft'}">${st}</span>` : ''}</div>
<span class="bigdate" style="margin-top:6px"><b style="font-size:clamp(72px,12vw,140px)">${md(t.d)}</b><span>${wdEn(wdOf(t.d))}${t.end !== t.d ? '〜' : ''}</span></span>
<h1 style="font-size:clamp(22px,3vw,34px);font-weight:900;line-height:1.4">${esc(t.title)}</h1>
<p class="hero-sub">${esc(gamesLabel(t))}${t.classes.length ? '・' + esc(classLabel(t)) : ''}${daysTo > 0 ? `・あと${daysTo}日` : daysTo === 0 ? '・今日' : ''}</p>
</div></div>
<main class="wrap"><div class="cols">
<div style="display:flex;flex-direction:column;gap:14px;padding-top:20px">
${t.dead ? `<div class="msg ng">この大会は「${st}」となっています。最新情報は主催者にご確認ください。</div>` : ''}
<dl class="card dl">${rows.join('')}</dl>
${flyer ? `<a href="${flyer}" target="_blank" rel="noopener" class="card" style="display:block;overflow:hidden"><img src="${flyer}" alt="${esc(t.title)}の大会要項" loading="lazy" style="display:block;width:100%"></a>` : ''}
<div class="btns"><a class="btn btn-dark" href="https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(t.title)}&dates=${t.starts_at.replace(/[-:]/g, '').slice(0, 15)}/${(t.ends_at || t.starts_at).replace(/[-:]/g, '').slice(0, 15)}&ctz=Asia/Tokyo&location=${encodeURIComponent(t.venue)}" target="_blank" rel="noopener">${svg('cal', 18)}予定に追加</a><a class="btn btn-line" href="https://line.me/R/share?text=${encodeURIComponent(t.title + ' ' + SITE + t.url)}" target="_blank" rel="noopener">LINEで送る</a></div>
${res}
</div>
<div style="display:flex;flex-direction:column;gap:14px;padding-top:20px">
<a class="card pad" href="${LINE_ADD}" target="_blank" rel="noopener" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;background:var(--lime);box-shadow:none;text-decoration:none"><span><b style="display:block;font-size:15px">結果をLINEで受け取る</b><small style="font-size:12px">公式LINEで大会情報と結果を配信中</small></span><span class="go-c" style="background:var(--night)">${svg('next', 16, '#C0FC09', 2.6)}</span></a>
${transitBlock(station.replace(/駅$/, ''), '電車でこの会場へ', station ? `最寄り：${station}` : '会場の最寄り駅を入力')}
${same.length ? `<div class="sec-h"><h2 style="font-size:16px">近い日程の${t.cat === 'official' ? '公式戦' : t.cat === 'monthly' ? '月例会' : t.cat === 'event' ? 'イベント' : 'ハウストーナメント'}</h2></div><div class="card list">${same.map((x) => tRow(x, { showDate: true })).join('')}</div>` : ''}
</div></div></main>`;
  const ld = { '@context': 'https://schema.org', '@type': 'SportsEvent', name: t.title, startDate: t.starts_at, endDate: t.ends_at || undefined, eventStatus: t.entry_status === 'cancelled' ? 'https://schema.org/EventCancelled' : t.entry_status === 'postponed' ? 'https://schema.org/EventPostponed' : 'https://schema.org/EventScheduled', location: { '@type': 'Place', name: t.venue || '会場', address: [t.pref, t.city].filter(Boolean).join('') || undefined }, sport: 'Billiards', url: SITE + t.url };
  put(t.url, page({ title: `${t.title}（${mdJa(t.d)}）`, desc: `${mdJa(t.d)} ${t.venue}${t.pref ? '（' + t.pref + '）' : ''}・${gamesLabel(t)}。${t.summary || ''}`.slice(0, 160), path: t.url, cur: 't', body, extraHead: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`, scripts: `<script src="/js/transit.js?v=${VER}" defer></script>` }));
}

/* ================= SHOPS (venues) ================= */
function venue(s) {
  const up = (s.tours || []).filter((t) => t.upcoming).slice(0, 10);
  const past = (s.tours || []).filter((t) => !t.upcoming && (t.winner || t.results)).slice(-5).reverse();
  const rows = [];
  const add = (k, v) => { if (v) rows.push(`<dt>${k}</dt><dd>${v}</dd>`); };
  add('住所', esc(s.address || (s.prefecture || '') + (s.city || '')));
  add('最寄り', esc(s.station || s.access));
  add('営業', esc([s.hours, s.hours_note].filter(Boolean).join('\n')));
  add('電話', s.phone ? `<a href="tel:${s.phone.replace(/[^\d]/g, '')}">${esc(s.phone)}</a>` : '');
  add('台', esc(s.tables.join('・')));
  add('料金', esc(s.fees));
  add('駐車場', esc(s.parking));
  add('定例会', esc(s.events.join('\n')));
  add('Web', s.website ? `<a href="${esc(s.website)}" target="_blank" rel="noopener">${esc(s.website.replace(/^https?:\/\//, '').replace(/\/$/, ''))}</a>` : '');
  add('LINE', s.line_url ? `<a href="${esc(s.line_url)}" target="_blank" rel="noopener">お店のLINE</a>` : '');
  const isWind = s.handle === 'billiard-wind';
  const q = encodeURIComponent(s.name + ' ' + (s.address || s.prefecture + s.city));
  const body = `
<div class="band"><div class="wrap band-in">
<p class="crumb"><a href="/">トップ</a> ／ <a href="/pages/near">ビリヤード場</a>${s.prefecture ? ` ／ <a href="/pages/near?pref=${encodeURIComponent(s.prefecture)}">${esc(s.prefecture)}</a>` : ''}</p>
<div style="display:flex;gap:6px;flex-wrap:wrap">${isWind ? '<span class="badge b-off">デジタルカウント導入店</span><span class="badge b-soft">旋盤あり</span>' : ''}${s.tables.map((x) => `<span class="badge b-soft">${esc(x)}</span>`).join('')}</div>
<h1 style="font-size:clamp(26px,3.4vw,40px);font-weight:900">${esc(s.name)}</h1>
<p class="hero-sub">${esc(s.address || (s.prefecture || '') + (s.city || ''))}</p>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;max-width:520px">
${s.phone ? `<a class="btn btn-lime btn-sm" href="tel:${s.phone.replace(/[^\d]/g, '')}" style="flex-direction:column;gap:2px;min-height:64px">${svg('phone', 20)}電話</a>` : ''}
<a class="btn btn-sm" href="https://www.google.com/maps/search/?api=1&query=${q}" target="_blank" rel="noopener" style="background:var(--night2);color:var(--chalk);flex-direction:column;gap:2px;min-height:64px">${svg('pin', 20)}地図</a>
<a class="btn btn-sm" href="#t" style="background:var(--night2);color:var(--chalk);flex-direction:column;gap:2px;min-height:64px">${svg('cal', 20)}大会</a>
</div></div></div>
<main class="wrap"><div class="cols">
<div style="display:flex;flex-direction:column;gap:14px;padding-top:20px">
<dl class="card dl">${rows.join('')}</dl>
<section class="sec" id="t" style="padding-top:10px"><div class="sec-h"><h2 style="font-size:18px">このお店の大会</h2></div>
${up.length ? `<div class="card list">${up.map((t) => tRow(t, { showDate: true })).join('')}</div>` : `<div class="empty"><b>予定されている大会はまだありません。</b><a class="btn btn-dark btn-sm" href="/pages/tournament-form">お店の方：大会を掲載する</a></div>`}
${past.length ? `<div class="card dark list" style="margin-top:8px">${past.map(rRow).join('')}</div>` : ''}</section>
${isWind ? `<section class="sec" style="padding-top:10px"><div class="sec-h"><h2 style="font-size:18px">キューのメンテナンス</h2></div><div class="card list">${[['タップ交換', '¥1,000〜'], ['先角交換', '¥5,000〜'], ['木のシャフト テーパー整備', '¥3,000〜'], ['シャフトのジョイント交換', 'ASK']].map(([a, b]) => `<div class="row" style="grid-template-columns:minmax(0,1fr) auto"><span class="tt">${a}</span><span class="disp" style="font-size:20px">${b}</span></div>`).join('')}</div><p class="muted" style="font-size:11px">価格は税込。お店の旋盤でその場で作業します。</p>
<a class="dc" href="/pages/shaft"><span><span class="cue-pair">このお店で注文できます</span><span class="tx" style="font-size:15px;font-weight:900">Vibes Carbon Shaft　¥25,000</span></span><span class="go-c">${svg('next', 16, '#171A22', 2.6)}</span></a></section>` : ''}
</div>
<div style="display:flex;flex-direction:column;gap:14px;padding-top:20px">
${transitBlock((s.station || '').replace(/駅$/, '').replace(/\s.*$/, ''), '電車でこのお店へ', s.station ? `最寄り：${s.station}` : 'お店の最寄り駅を入力')}
<div class="empty"><b>情報がちがう・閉店した</b><p>営業時間や台数の変更、閉店・移転に気づいたら、公式LINEで教えてください。確認して更新します。</p><a class="btn btn-lineapp btn-sm" href="${LINE_ADD}" target="_blank" rel="noopener">LINEで知らせる</a></div>
${s.source === 'billi-walker' ? `<p class="muted" style="font-size:11px">店舗情報の出典：<a href="${esc(s.source_url || 'https://billi-walker.jp/bwpoolhall/')}" target="_blank" rel="noopener">ビリウォーカー</a>ほか</p>` : ''}
</div></div></main>`;
  put(s.url, page({ title: `${s.name}（${s.prefecture || ''}${s.city || ''}）`, desc: `${s.name}：${s.address || ''} ${s.hours || ''} ${s.tables.join('・')}。大会情報と乗換案内。`.slice(0, 160), path: s.url, cur: 's', body, scripts: `<script src="/js/transit.js?v=${VER}" defer></script>` }));
}

function near() {
  const ev = '~' + upcoming.filter((t) => t.shop).map((t) => '~' + t.shop.handle + '~').join('') + 'x';
  const body = `
<div class="band"><div class="wrap band-in narrow">
<div class="ph"><h1>近くのビリヤード場</h1><p>現在地から近い順に、全国のビリヤード場と開催予定の大会を表示します。位置情報はこの画面の中だけで使い、保存や送信はしません。</p></div>
<button class="btn btn-lime btn-block" id="nr-go" type="button">${svg('pin', 22, 'currentColor', 2.4)}<span>現在地から探す</span></button>
<a class="btn btn-line btn-block btn-sm" id="nr-gm" href="https://www.google.com/maps/search/%E3%83%93%E3%83%AA%E3%83%A4%E3%83%BC%E3%83%89%E5%A0%B4" target="_blank" rel="noopener">Googleマップで周辺をすべて見る</a>
</div></div>
<main class="wrap narrow">
<form class="search-m" id="nr-q" role="search" action="/pages/near" style="display:flex;margin-top:18px">${svg('search', 20, '#5B5F6B')}<input type="search" name="q" id="nr-qi" placeholder="店名・駅・市区町村で探す" aria-label="店名・駅・市区町村で探す" autocomplete="off"><button type="submit" class="btn btn-dark btn-sm">検索</button></form>
<p class="count" id="nr-msg" aria-live="polite" style="margin-top:14px"></p>
<div id="nr-list"></div>
<div id="nr-prefbox" hidden><p class="count" style="margin-top:14px">位置情報を使わない場合は、都道府県からえらべます。</p><div class="chips" id="nr-pref" style="margin-top:8px"></div></div>
<div class="empty" style="margin-top:22px"><b>全国 ${shops.length.toLocaleString()} 店を掲載</b><p>ビリウォーカーの公開情報・店舗からの情報・読者からの情報をもとに随時更新しています。新しいお店や閉店・移転を見つけたら、<a href="${LINE_ADD}" target="_blank" rel="noopener">公式LINE</a>で教えてください。距離は直線距離の目安です。お店の位置は国土地理院の住所検索で求めています。</p></div>
<div class="sec"><div class="sec-h"><h2>都道府県から探す</h2></div><div class="chips">${PREFS.filter((p) => shops.some((s) => s.prefecture === p)).map((p) => `<a class="chip" href="/pages/near?pref=${encodeURIComponent(p)}">${p.replace(/[都府県]$/, '')}</a>`).join('')}</div></div>
</main>
<script type="application/json" id="nr-ev">${JSON.stringify(ev)}</script>`;
  put('/pages/near', page({ title: '近くのビリヤード場', desc: `現在地・駅名・店名から全国${shops.length}店のビリヤード場を検索。開催予定の大会も表示。`, path: '/pages/near', cur: 's', body, scripts: `<script src="/js/near.js?v=${VER}" defer></script>` }));
  // per-prefecture index pages for search engines
  for (const p of PREFS) {
    const list = shops.filter((s) => s.prefecture === p);
    if (!list.length) continue;
    const url = `/pages/near/${encodeURIComponent(p)}`;
    put(url, page({ title: `${p}のビリヤード場（${list.length}店）`, desc: `${p}のビリヤード場${list.length}店の一覧。住所・営業時間・台数・大会情報。`, path: url, cur: 's', body: `<div class="band"><div class="wrap band-in"><p class="crumb"><a href="/">トップ</a> ／ <a href="/pages/near">ビリヤード場</a></p><div class="ph"><h1>${p}のビリヤード場</h1><p>${list.length}店を掲載しています。</p></div><a class="btn btn-lime" href="/pages/near?pref=${encodeURIComponent(p)}">近い順・大会の多い順で探す</a></div></div><main class="wrap narrow"><div class="card list" style="margin-top:18px">${list.sort((a, b) => String(a.city).localeCompare(String(b.city), 'ja')).map((s) => `<a class="near-row" href="${s.url}"><span><b>${esc(s.name)}</b><small>${esc((s.city || '') + (s.station ? '・' + s.station : ''))}${s.tables.length ? '・' + esc(s.tables.join('・')) : ''}</small></span>${(s.tours || []).some((t) => t.upcoming) ? '<span class="badge b-off">大会あり</span>' : ''}</a>`).join('')}</div></main>` }));
  }
}

/* ================= BLOGS ================= */
function blogIndex(b) {
  const list = artsOf(b);
  const intro = { news: '公式戦のスケジュール・エントリー情報と、VIBESのお知らせ。', results: '公式戦とハウストーナメントの試合結果。', 'house-tournament': '各店のハウストーナメント情報。', live: '会場から届いた試合速報。' }[b];
  let extra = '';
  if (b === 'results') extra = `<section class="sec"><div class="sec-h"><h2>大会ごとの結果</h2></div><div class="card dark list">${withResults.slice(0, 30).map(rRow).join('')}</div></section>`;
  if (b === 'house-tournament') extra = `<section class="sec"><div class="sec-h"><h2>これからのハウストーナメント</h2><a href="/pages/tournaments?k=house">すべて</a></div><div class="card list">${upcoming.filter((t) => t.cat === 'house' && t.d >= today).slice(0, 20).map((t) => tRow(t, { showDate: true })).join('')}</div></section>`;
  const liveTop = b === 'live' ? `<section class="sec"><div class="cols eq">
<div class="card pad" style="display:flex;flex-direction:column;gap:10px"><h2 style="font-size:18px">送り方</h2><ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px">${['公式LINEで「速報」と送る', 'スコア表・トーナメント表の写真を送る', 'VIBESが確認して、ここと大会ページに掲載'].map((x, i) => `<li style="display:grid;grid-template-columns:40px 1fr;gap:12px;align-items:center"><span class="disp" style="font-size:26px">0${i + 1}</span><b style="font-size:14px">${x}</b></li>`).join('')}</ol><a class="btn btn-lime" href="https://line.me/R/oaMessage/${encodeURIComponent(LINE_ID)}/?${encodeURIComponent('速報')}" target="_blank" rel="noopener">LINEで速報を送る</a></div>
<div class="card dark pad" style="display:flex;flex-direction:column;gap:8px"><b class="disp" style="font-size:20px;color:var(--lime);letter-spacing:.04em">LIVE</b><p style="font-size:13px;line-height:1.7">台のスコアをそのまま中継する機能は、準備ができ次第リリースします。</p><a class="btn btn-line btn-sm" href="/pages/live-table">デジタルカウントを使う</a></div>
</div></section>` : '';
  const body = `<div class="band"><div class="wrap band-in"><p class="crumb"><a href="/">トップ</a></p><div class="ph"><h1>${blogs[b]}</h1><p>${intro}</p></div></div></div>
<main class="wrap">${liveTop}
<section class="sec">${list.length ? `<div class="card list">${list.map(nRow).join('')}</div>` : `<div class="empty"><b>まだ記事はありません。</b><p>最初の1枚を送ってくれた方の速報から、ここに並びます。</p></div>`}</section>
${extra}</main>`;
  put(`/blogs/${b}`, page({ title: blogs[b], desc: intro, path: `/blogs/${b}`, cur: cur[b], body }));
}

function article(a) {
  const rel = artsOf(a.blog).filter((x) => x !== a).slice(0, 5);
  const body = `<div class="band"><div class="wrap band-in narrow"><p class="crumb"><a href="/">トップ</a> ／ <a href="/blogs/${a.blog}">${blogs[a.blog] || a.blogTitle}</a></p>
<p class="disp" style="font-size:22px;color:var(--sub-d)">${a.date.replace(/-/g, '.')}</p><h1 style="font-size:clamp(22px,3vw,34px);font-weight:900;line-height:1.4">${esc(a.title)}</h1></div></div>
<main class="wrap narrow"><article class="prose" style="padding-top:24px">${fixHtml(a.body)}</article>
<div class="btns" style="margin-top:20px"><a class="btn btn-line btn-sm" href="https://line.me/R/share?text=${encodeURIComponent(a.title + ' ' + SITE + a.url)}" target="_blank" rel="noopener">LINEで送る</a><a class="btn btn-lineapp btn-sm" href="${LINE_ADD}" target="_blank" rel="noopener">公式LINEで受け取る</a></div>
${rel.length ? `<section class="sec"><div class="sec-h"><h2>${blogs[a.blog] || ''}の記事</h2></div><div class="card list">${rel.map(nRow).join('')}</div></section>` : ''}</main>`;
  const ld = { '@context': 'https://schema.org', '@type': 'Article', headline: a.title, datePublished: a.publishedAt, dateModified: a.updatedAt, publisher: { '@type': 'Organization', name: 'VIBES BILLIARDS' } };
  put(a.url, page({ title: a.title, desc: a.excerpt, path: a.url, cur: cur[a.blog], body, image: a.image?.url && !/cdn\.shopify/.test(a.image.url) ? a.image.url : undefined, extraHead: `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>` }));
}

const LOCAL_FILES = ['vibes-kids-open-pc.jpg', 'vibes-kids-open-sq.jpg', 'vibes-live-table-pc.jpg', 'vibes-live-table-sq.jpg', 'vibes-og-new-features-2026-11.jpg', 'tee-v2-01.webp', 'tee-v2-02.webp', 'tee-v2-03.webp', 'tee-v2-04.webp', 'tee-v2-05.webp', 'tee-v2-06.webp', 'tee-v2-07.webp', 'tee-v2-08.webp', 'cap-v1-01.webp', 'Official_LOGO.png', 'vibes-icon-official-512.png', 'nba-kansai-20261129-tankyori-open.jpg'];
function fixHtml(h) {
  return String(h || '')
    .replace(/https:\/\/cdn\.shopify\.com\/s\/files\/1\/0792\/5533\/9107\/files\/([^"'?\s)]+)(\?[^"'\s)]*)?/g, (m, f) => (f === 'Official_LOGO.png' ? '/img/vibes-logo.png' : f === 'vibes-icon-official-512.png' ? '/img/icon-512.png' : LOCAL_FILES.includes(f) ? `/img/${f}` : m))
    .replace(/https:\/\/vibesbilliards\.com\//g, '/')
    .replace(/#FA4E02/gi, '#C0FC09');
}

/* ================= PLAYERS ================= */
function playersPages() {
  const list = [...players.values()].sort((a, b) => (a.wins[0].d < b.wins[0].d ? 1 : -1));
  const body = `<div class="band"><div class="wrap band-in"><p class="crumb"><a href="/">トップ</a></p><div class="ph"><h1>選手</h1><p>VIBESに載った大会の優勝者を、選手ごとにまとめています。結果を掲載するたびに自動で増えていきます。</p></div></div></div>
<main class="wrap"><section class="sec"><div class="count">${list.length}人</div><div class="hscroll" style="flex-wrap:wrap">${list.map(pCard).join('')}</div></section>
<section class="sec"><div class="empty"><b>ご本人の方へ</b><p>所属・ホームのお店・使用キューなどを追加できます。公式LINEで「選手ページ」とお送りください。</p><a class="btn btn-lineapp btn-sm" href="${LINE_ADD}" target="_blank" rel="noopener">LINEで申請する</a></div></section></main>`;
  put('/pages/players', page({ title: '選手', desc: 'ビリヤード大会の優勝者を選手ごとに。成績が自動でたまる選手ページ。', path: '/pages/players', cur: 'p', body }));
  for (const p of list) {
    const carom = p.disc === 'carom';
    const body = `<div class="band"><div class="wrap band-in narrow"><p class="crumb"><a href="/">トップ</a> ／ <a href="/pages/players">選手</a></p>
<div style="display:flex;align-items:center;gap:16px">${ball(p.name, carom, true)}<div style="display:flex;flex-direction:column;gap:4px"><span style="font-size:11px;font-weight:700;color:var(--sub-d)">PLAYER</span><h1 style="font-size:28px;font-weight:900">${esc(p.name)}</h1><span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;color:var(--sub-d)">${fdot(p.disc)}${DISC[p.disc].ja}</span></div></div>
<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
<div style="display:flex;flex-direction:column;gap:2px;padding:12px;border-radius:16px;background:var(--night2)"><span class="disp" style="font-size:34px;color:var(--lime)">${p.wins.length}</span><span style="font-size:10px;font-weight:700;color:var(--sub-d)">優勝</span></div>
<div style="display:flex;flex-direction:column;gap:2px;padding:12px;border-radius:16px;background:var(--night2)"><span class="disp" style="font-size:34px">${p.wins.length}</span><span style="font-size:10px;font-weight:700;color:var(--sub-d)">掲載大会</span></div>
<div style="display:flex;flex-direction:column;gap:2px;padding:12px;border-radius:16px;background:var(--night2)"><span class="disp" style="font-size:34px">${md(p.wins[0].d)}</span><span style="font-size:10px;font-weight:700;color:var(--sub-d)">最新の結果</span></div></div>
<a class="btn btn-lime btn-block" href="${LINE_ADD}" target="_blank" rel="noopener">${svg('plus', 18, 'currentColor', 2.4)}フォローして結果をLINEで受け取る</a></div></div>
<main class="wrap narrow"><section class="sec"><div class="sec-h"><h2>VIBESに載った成績</h2></div>
<div class="card list">${p.wins.map((t) => `<a class="row" href="${t.url}" style="grid-template-columns:64px minmax(0,1fr) auto"><span class="tm" style="font-size:20px">${md(t.d)}</span><span><span class="tt">${esc(t.title)}</span><span class="vv" style="display:block">${catBadge(t)} ${esc(DISC[t.disc].ja)}・${esc(t.venue)}</span></span><b style="font-size:14px">優勝</b></a>`).join('')}</div>
<p class="muted" style="font-size:12px">VIBESが掲載した大会の結果から、自動でこのページに追加されます。</p></section>
<section class="sec"><div class="card dark pad" style="display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center"><span><b style="display:block;font-size:14px">ご本人の方へ</b><span style="display:block;font-size:12px;color:var(--sub-d);margin-top:4px">所属・ホームのお店・使用キューを追加できます。</span></span><a class="btn btn-sm" style="background:var(--chalk);color:var(--night)" href="${LINE_ADD}" target="_blank" rel="noopener">申請する</a></div></section></main>`;
    put(p.url, page({ title: `${p.name}（ビリヤード選手）`, desc: `${p.name}選手の成績：${p.wins.map((t) => `${md(t.d)} ${t.title} 優勝`).join('、')}`.slice(0, 160), path: p.url, cur: 'p', body }));
  }
}

/* ================= DISCIPLINE PAGES ================= */
function discPage(key, handle) {
  const d = DISC[key];
  const pg = pages[handle];
  const up = upcoming.filter((t) => t.disc === key && t.d >= today);
  const res = withResults.filter((t) => t.disc === key).slice(0, 12);
  const kw = key === 'carom' ? /キャロム|スリークッション|3C|3C|関東アマ|NBA|バンド|ADAM/ : key === 'heyball' ? /ヘイボール|HEYBALL|HeyBall/i : /ナインボール|9ボール|10ボール|JPBA|JAPA|ポケット|プール/;
  const news = articles.filter((a) => a.blog !== 'house-tournament' && kw.test(a.title)).slice(0, 8);
  const body = `<div class="band" style="background:var(--felt-${key})"><div class="wrap band-in"><p class="crumb"><a href="/" style="color:#fff">トップ</a></p>
<span class="disp" style="font-size:clamp(56px,10vw,120px);color:var(--lime)">${d.en}</span><div class="ph" style="padding-top:0"><h1>${esc(pg?.title || d.ja)}</h1><p style="color:#fff;opacity:.85">${esc(stripTxt(pg?.body))}</p></div>
<a class="btn btn-lime" href="/pages/tournaments?g=${key}">${d.ja}の大会をさがす</a></div></div>
<main class="wrap"><section class="sec"><div class="sec-h"><h2>これからの大会</h2><a href="/pages/tournaments?g=${key}">すべて（${up.length}件）</a></div>${up.length ? `<div class="card list">${up.slice(0, 15).map((t) => tRow(t, { showDate: true })).join('')}</div>` : '<div class="empty"><b>開催予定の大会はまだありません。</b></div>'}</section>
<section class="sec"><div class="cols"><div style="display:flex;flex-direction:column;gap:12px"><div class="sec-h"><h2>試合結果</h2><a href="/blogs/results">すべて</a></div>${res.length ? `<div class="card dark list">${res.map(rRow).join('')}</div>` : '<div class="empty"><b>まだ結果はありません。</b></div>'}</div>
<div style="display:flex;flex-direction:column;gap:12px"><div class="sec-h"><h2>NEWS</h2><a href="/blogs/news">すべて</a></div>${news.length ? `<div class="card list">${news.map(nRow).join('')}</div>` : '<div class="empty"><b>関連するNEWSはまだありません。</b></div>'}</div></div></section>
${key === 'heyball' ? '<section class="sec"><a class="tile" href="/pages/heyball"><b>HEYBALL（ヘイボール）とは？</b><small>ルール・テーブル・はじめ方</small></a></section>' : ''}
<section class="sec">${discTiles()}</section></main>`;
  put(`/pages/${handle}`, page({ title: pg?.title || d.ja, desc: stripTxt(pg?.body), path: `/pages/${handle}`, cur: { pocket: 'pk', carom: 'cr', heyball: 'hb' }[key], body }));
}
const stripTxt = (h) => String(h || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').trim();

/* ================= PORTED CONTENT PAGES ================= */
function port(file, { upcomingHtml = '', snippets = {}, orange } = {}) {
  let h = fs.readFileSync(path.join(THEME, file), 'utf8');
  if (orange) h = h.replace(/#FA4E02/gi, orange);
  h = h.replace(/\{%-?\s*schema\s*-?%\}[\s\S]*?\{%-?\s*endschema\s*-?%\}/g, '')
    .replace(/\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}/g, '')
    .replace(/\{%-?\s*paginate[\s\S]*?\{%-?\s*endpaginate\s*-?%\}/g, '')
    .replace(/\{%-?\s*if keys\.size > 0\s*-?%\}[\s\S]*?\{%-?\s*else\s*-?%\}([\s\S]*?)\{%-?\s*endif\s*-?%\}/g, (m, empty) => upcomingHtml || empty)
    .replace(/\{\{\s*'[^']+'\s*\|\s*asset_url\s*\|\s*stylesheet_tag\s*\}\}/g, '')
    .replace(/\{%-?\s*render '([^']+)'\s*-?%\}/g, (m, n) => snippets[n] ?? '')
    .replace(/\{%-?\s*assign[\s\S]*?%\}/g, '')
    .replace(/\{\{\s*shaft_url\s*\}\}/g, '/products/vibes-carbon-shaft')
    .replace(/\{\{\s*icon\s*\}\}&width=\d+/g, '/img/icon-512.png').replace(/\{\{\s*icon\s*\}\}/g, '/img/icon-512.png');
  h = fixHtml(h).replace(/Shopifyのカートは使いません。/g, '').replace(/#C6FF1F/gi, '#C0FC09').replace(/#0A0A09/gi, '#171A22');
  const left = h.match(/\{[{%][^}]*[}%]\}/g);
  if (left) console.warn('Liquid left in', file, left.slice(0, 3));
  return h;
}
function contentPages() {
  const hbUp = upcoming.filter((t) => t.disc === 'heyball' && t.d >= today);
  const jpaUp = upcoming.filter((t) => /JPA/.test(t.source_name || '') && t.d >= today);
  const list = (l) => (l.length ? `<div class="card list" style="margin:8px 0">${l.map((t) => tRow(t, { showDate: true })).join('')}</div>` : '');
  const legacyPage = (url, file, title, desc, curK, opt) => put(url, page({ title, desc, path: url, cur: curK, legacy: true, body: `<main>${port(file, opt)}</main>` }));
  legacyPage('/pages/heyball', 'sections/vibes-heyball.liquid', 'HEYBALL（ヘイボール）とは？', stripTxt(pages.heyball?.body).slice(0, 150), 'hb', { upcomingHtml: list(hbUp) });
  legacyPage('/pages/jpa', 'sections/vibes-jpa.liquid', 'JPA（プールリーグ）とは？', stripTxt(pages.jpa?.body).slice(0, 150), '', { upcomingHtml: list(jpaUp) });
  legacyPage('/pages/app', 'sections/vibes-app.liquid', 'VIBESアプリ', 'VIBESはスマホのホーム画面に置いて使える無料アプリです。', '');
  legacyPage('/pages/wear', 'sections/vibes-wear-page.liquid', 'Wear Vibes（オフィシャルTシャツ）', stripTxt(pages.wear?.body).slice(0, 150), '', { snippets: { 'vibes-wear': fs.readFileSync(path.join(THEME, 'snippets/vibes-wear.liquid'), 'utf8') } });
  legacyPage('/pages/shaft', 'sections/vibes-shaft-page.liquid', 'Vibes Carbon Shaft｜パターンオーダーのカーボンシャフト', stripTxt(pages.shaft?.body).slice(0, 150), '', { snippets: { 'vibes-gallery': '' }, orange: '#171A22' });

  // standalone apps (own full-screen layout)
  const lt = fs.readFileSync(path.join(THEME, 'templates/page.live-table.liquid'), 'utf8')
    .replace('{% layout none %}', '').replace(/\{\{\s*canonical_url\s*\}\}/g, SITE + '/pages/live-table').replace(/\{%-? if settings\.favicon[\s\S]*?endif -?%\}/, '<link rel="icon" href="/img/favicon-64.png">').replace('{{ content_for_header }}', '')
    .replace(/https:\/\/cdn\.shopify\.com\/s\/files\/1\/0792\/5533\/9107\/files\/vibes-live-table-v3\.css\?v=\d+/, '/apps/live-table/vibes-live-table-v3.css').replace(/https:\/\/cdn\.shopify\.com\/s\/files\/1\/0792\/5533\/9107\/files\/vibes-live-table-v4\.js\?v=\d+/, '/apps/live-table/vibes-live-table-v4.js');
  put('/pages/live-table', { raw: fixHtml(lt).replace('</head>', '<style>#lt-root input,#lt-root select{min-width:0;max-width:100%;box-sizing:border-box}</style></head>') });
  const kids = fs.readFileSync(path.join(THEME, 'templates/page.kids.liquid'), 'utf8')
    .replace('{% layout none %}', '').replace(/\{\{\s*canonical_url\s*\}\}/g, SITE + '/pages/kids').replace(/\{%-? if settings\.favicon[\s\S]*?endif -?%\}/, '<link rel="icon" href="/img/favicon-64.png">').replace('{{ content_for_header }}', '')
    .replace(/https:\/\/cdn\.shopify\.com\/s\/files\/1\/0792\/5533\/9107\/files\/vibes-kids-v2\.css\?v=\d+/, '/apps/kids/vibes-kids-v2.css').replace(/https:\/\/cdn\.shopify\.com\/s\/files\/1\/0792\/5533\/9107\/files\/vibes-kids-v2\.js\?v=\d+/, '/apps/kids/vibes-kids-v2.js');
  put('/pages/kids', { raw: fixHtml(kids) });
  put('/pages/count-3c', { raw: fs.readFileSync(path.join(ROOT, 'static/apps/count-3c.html'), 'utf8') });
  put('/pages/count-remote', { raw: fs.readFileSync(path.join(ROOT, 'static/apps/count-remote.html'), 'utf8') });
  const nd = fs.readFileSync(path.join(ROOT, 'static/apps/nine-drop.html'), 'utf8');
  put('/pages/nine-drop', { raw: `<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><link rel="icon" href="/img/favicon-64.png"><link rel="canonical" href="${SITE}/pages/nine-drop"><meta name="description" content="ナインボールのルールで遊ぶ落ち物パズル。"><style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}[hidden]{display:none!important}</style></head><body>${nd.replace('<title>Nine Drop</title>', '<title>NINE DROP｜VIBES BILLIARDS</title>')}</body></html>` });

  // simple text pages from Shopify page bodies
  for (const h of ['legal-notice', 'privacy-policy', 'refund-policy']) {
    const p = pages[h];
    put(`/pages/${h}`, page({ title: p.title, path: `/pages/${h}`, body: `<div class="band"><div class="wrap band-in narrow"><div class="ph"><h1>${esc(p.title)}</h1></div></div></div><main class="wrap narrow"><div class="prose card pad" style="margin-top:20px">${fixHtml(p.body).replace(/当ストアは Shopify のプラットフォーム上で運営されており、/, '当サイトは、')}</div></main>` }));
  }
  for (const h of ['tournament-form', 'tournament-entry']) {
    const p = pages[h];
    put(`/pages/${h}`, page({ title: p.title, path: `/pages/${h}`, desc: '店舗様向け：ハウストーナメントをVIBESに無料で掲載できます。', body: `<div class="band"><div class="wrap band-in narrow"><div class="ph"><h1>${esc(p.title)}</h1><p>入力して送信するだけで、大会カレンダーと公式LINE配信に掲載されます。掲載は無料です。</p></div></div></div><main class="wrap narrow" style="padding-top:20px">${fixHtml(p.body)}</main>` }));
  }
}

/* ================= CONTACT / ORDER / GUIDE ================= */
function contact() {
  const body = `<div class="band"><div class="wrap band-in narrow"><div class="ph"><h1>お問い合わせ</h1><p>${stripTxt(pages.contact?.body).replace(/メール：.*$/, '')}</p></div></div></div>
<main class="wrap narrow"><div class="cols eq" style="padding-top:20px">
<form class="card pad form" data-hook="${esc(config.contactHook || '')}" data-kind="contact" novalidate>
<label>お名前<span class="req">必須</span><input name="name" required autocomplete="name"></label>
<label>メールアドレス<span class="req">必須</span><input type="email" name="email" required autocomplete="email"></label>
<label>内容<span class="req">必須</span><textarea name="message" required></textarea></label>
<div class="hp"><input name="hp" tabindex="-1" autocomplete="off"></div>
<button class="btn btn-dark" type="submit">送信する</button><div class="msg" hidden data-msg></div></form>
<div style="display:flex;flex-direction:column;gap:10px"><div class="card pad"><b>メール</b><p style="font-size:16px;font-weight:900;margin-top:4px">${EMAIL}</p><p class="muted" style="font-size:12px;margin-top:6px">ジョイント規格が分からない場合は、バット側のピンを横から撮影した写真を添付してください。</p></div>
<a class="btn btn-lineapp" href="${LINE_ADD}" target="_blank" rel="noopener">公式LINEで問い合わせる</a></div>
</div></main>`;
  put('/pages/contact', page({ title: 'お問い合わせ', path: '/pages/contact', body: body.replace(/<label([^>]*)>([^<]+)<span class="req">必須<\/span>/g, '<label$1><span>$2<span class="req">必須</span></span>'), scripts: `<script src="/js/forms.js?v=${VER}" defer></script>` }));
}

function order() {
  const sel = (id, name, label, opts, def) => `<label id="${id}">${label}<span class="req">必須</span><select name="${name}" required>${opts.map((o) => `<option${o === def ? ' selected' : ''}>${esc(o)}</option>`).join('')}</select></label>`;
  const body = `<div class="band"><div class="wrap band-in narrow"><p class="crumb"><a href="/">トップ</a> ／ <a href="/pages/shaft">Vibes Carbon Shaft</a></p>
<div class="ph"><h1>Vibes Carbon Shaft をつくる</h1><p>仕様を選んで送信すると、ご注文を受け付けます。お支払いは銀行振込のみです（振込先はメールでご案内し、ご入金確認後に工場へ発注します）。カード決済は12月から対応予定です。</p></div>
<span class="disp" style="font-size:52px;color:var(--lime)" data-price>¥25,000</span><span class="hero-sub">税込・送料込・刻印込み・納期3〜4週間</span></div></div>
<main class="wrap narrow"><form class="form" style="padding-top:20px" data-hook="${esc(config.orderHook || '')}" data-kind="order" novalidate>
<div class="card pad form">
${sel('vb-len', 'length', '01 長さ', ['27in（68.6cm）標準', '28in（71.1cm）', '29in（73.7cm）', '30in（76.2cm）', '31in（78.7cm）'])}
${sel('vb-taper', 'taper', '02 テーパー', ['MELLOW（ストレート・ポケット向き）', 'JAZZY（コニカル・スリークッション向き）'])}
${sel('vb-tip', 'tip', '03 先端径', ['10.5mm', '11.8mm', '12.0mm', '12.4mm', '12.5mm', '12.8mm'], '12.4mm')}
${sel('vb-joint', 'joint', '04 ジョイント', ['Radial', '3/8×10', '3/8×11', '3/8×14', '5/16×14', 'United', '5/16×18', 'Uni-Loc', 'VP2（Longoni）', '分からない（写真で相談）'])}
${sel('vb-weight', 'weight', '05 ウェイト', ['110g', '112g', '114g', '115g', '116g', '118g', '120g', '122g', '125g', '110g未満（相談）'], '115g')}
${sel('vb-engrave', 'engrave', '06 刻印', ['① なし（Vibesの刻印のみ）', '② なし＋自分の名前', '③ あり（オリジナルロゴのみ）', '④ あり＋自分の名前'])}
<label>刻印する名前（ローマ字）<input name="engrave_name" placeholder="例：TATSUYA ANDO" autocomplete="off"><span class="hint">②④を選んだ方のみ</span></label>
<label id="vb-color">07 ロゴの色<span class="req">必須</span><select name="color" required data-color><option value="単色（標準）">単色（標準・追加料金なし）</option><option value="カラー（+2,500円）">カラー（+¥2,500）</option></select><span class="hint">③④のオリジナルロゴが対象。ロゴデータ（PNG・PDF）は受付メールへの返信か公式LINEでお送りください。</span></label>
<label>お使いのキュー<input name="cue" placeholder="例：Predator / Longoni / Mezz など"></label>
</div>
<div class="card pad form">
<label>お名前<span class="req">必須</span><input name="name" required autocomplete="name"></label>
<label>メールアドレス<span class="req">必須</span><input type="email" name="email" required autocomplete="email"></label>
<label>電話番号<span class="req">必須</span><input type="tel" name="tel" required autocomplete="tel"></label>
<label>お届け先住所<span class="req">必須</span><textarea name="address" required autocomplete="street-address" style="min-height:80px"></textarea></label>
<label>備考<textarea name="note" style="min-height:80px"></textarea></label>
</div>
<div class="card pad" style="font-size:13px;line-height:1.75">パターンオーダーのため、お客様都合による返品はお受けできません。初期不良（振れ、刻印ミス、仕様違い）は交換いたします。<a href="/pages/refund-policy">返品・交換ポリシー</a>／<a href="/pages/legal-notice">特定商取引法に基づく表記</a></div>
<div class="hp"><input name="hp" tabindex="-1" autocomplete="off"></div>
<button class="btn btn-lime" type="submit">この仕様で注文する（銀行振込）</button><div class="msg" hidden data-msg></div>
<p class="muted" style="font-size:12px">お問い合わせ・ご注文の確認、工場への発注のご連絡は平日のみ対応しています。</p>
</form></main>`;
  put('/products/vibes-carbon-shaft', page({ title: 'Vibes Carbon Shaft をつくる（ご注文）', desc: 'パターンオーダーのカーボンシャフト。¥25,000（税込・送料込）。仕様を選んでご注文ください。', path: '/products/vibes-carbon-shaft', body: body.replace(/<label([^>]*)>([^<]+)<span class="req">必須<\/span>/g, '<label$1><span>$2<span class="req">必須</span></span>'), scripts: `<script src="/js/forms.js?v=${VER}" defer></script>` }));
}

function guide() {
  const cls = [['P', 'プロ'], ['A', '上級'], ['B', '中級'], ['C', '初級'], ['L', 'レディース'], ['ビギナー', 'はじめたばかりの人']];
  const steps = [['大会をさがす', '大会カレンダーで、エリア・種目・自分の級で絞り込みます。'], ['要項を確かめる', '参加費、申込の締切、試合の形式（何先か、ハンデの有無）を見ます。'], ['申し込む', '申し込み方法はお店ごとに違います（店頭・電話・フォームなど）。大会ページに書いてあります。'], ['当日は早めに受付', 'キューがなくても、お店の貸しキューで出られることが多いです。']];
  const body = `<div class="band"><div class="wrap band-in narrow"><p class="crumb"><a href="/">トップ</a></p><span class="disp" style="font-size:22px;color:var(--lime);letter-spacing:.04em">FIRST TOURNAMENT</span><div class="ph" style="padding-top:0"><h1>大会に出てみよう</h1><p>はじめての方は、お店が開く「ハウストーナメント」からがおすすめ。級の見方と、申し込みから当日までの流れをまとめました。</p></div></div></div>
<main class="wrap narrow">
<section class="sec"><div class="sec-h"><h2>大会名の「PABC級」とは</h2></div><div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${cls.map(([k, v]) => `<div class="card pad" style="display:flex;flex-direction:column;gap:4px"><span class="disp" style="font-size:30px">${k}</span><b style="font-size:12px">${v}</b></div>`).join('')}</div>
<p class="muted" style="font-size:13px">「BC級戦」ならB級とC級の人が出られる大会。級の決め方はお店ごとに違うので、迷ったらお店に聞くのがいちばん確実です。</p></section>
<section class="sec"><div class="sec-h"><h2>2種類の大会</h2></div><div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px">
<div class="card pad" style="display:flex;flex-direction:column;gap:6px"><span class="badge b-house" style="align-self:flex-start">ハウス</span><b style="font-size:13px;line-height:1.6">お店が開く大会。週1回や月1回あり、はじめてでも出やすい。</b></div>
<div class="card pad" style="display:flex;flex-direction:column;gap:6px"><span class="badge b-off" style="align-self:flex-start">公式戦</span><b style="font-size:13px;line-height:1.6">協会や団体が開く大会。参加条件や締切を要項で確認。</b></div></div></section>
<section class="sec"><div class="sec-h"><h2>申し込みから当日まで</h2></div><ol style="margin:0;padding:0;list-style:none;display:flex;flex-direction:column;gap:8px">${steps.map(([t, d], i) => `<li class="card pad" style="display:grid;grid-template-columns:44px minmax(0,1fr);gap:12px"><span class="disp" style="font-size:28px">0${i + 1}</span><span><b style="display:block;font-size:14px">${t}</b><span class="muted" style="display:block;font-size:12px;line-height:1.65;margin-top:2px">${d}</span></span></li>`).join('')}</ol></section>
<section class="sec"><a class="band-lime" href="/pages/tournaments?c=C" style="text-decoration:none;color:var(--night)"><span class="t" style="font-size:18px">C級・ビギナー向けの大会をさがす</span><span class="btn btn-dark">大会カレンダーを開く</span></a></section>
</main>`;
  put('/pages/guide', page({ title: '大会に出てみよう（P・A・B・C級の見方）', desc: 'ビリヤードのハウストーナメントに初めて出る方へ。PABC級の見方、申し込みから当日までの流れ。', path: '/pages/guide', body }));
}

/* ================= DATA FEEDS, SEO FILES ================= */
function feeds() {
  const tf = upcoming.map((t) => ({ d: t.d, e: t.end, p: t.pref, c: t.cat, g: t.games, h: t.handle }));
  fs.mkdirSync(path.join(DIST, 'data'), { recursive: true });
  fs.writeFileSync(path.join(DIST, 'data/tfeed.json'), JSON.stringify(tf));
  const nearItems = shops.map((s) => ({ h: s.handle, n: s.name, a: s.address || (s.prefecture || '') + (s.city || ''), p: s.prefecture || '', c: s.city || '', st: s.station || '', tel: s.phone || '', hr: s.hours || '', tb: s.tables.join('・'), u: s.url, lat: s.lat || '', lng: s.lng || '', exact: !!s.address }));
  fs.writeFileSync(path.join(DIST, 'data/near.json'), JSON.stringify({ next: false, nu: null, items: nearItems }));
  fs.writeFileSync(path.join(DIST, 'manifest.webmanifest'), JSON.stringify({ name: 'VIBES BILLIARDS', short_name: 'VIBES', start_url: '/?source=app', display: 'standalone', background_color: '#171A22', theme_color: '#171A22', icons: [{ src: '/img/icon-180.png', sizes: '180x180', type: 'image/png' }, { src: '/img/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/img/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }));
}

function notFound() {
  put('/404.html', page({ title: 'ページが見つかりません', path: '/404', noindex: true, body: `<div class="band"><div class="wrap band-in"><span class="disp" style="font-size:120px;color:var(--lime)">404</span><div class="ph"><h1>ページが見つかりません</h1><p>URLが変わったか、ページが削除された可能性があります。</p></div><div class="btns"><a class="btn btn-lime" href="/">トップへ</a><a class="btn btn-line" href="/pages/tournaments">大会をさがす</a></div></div></div><main></main>` }));
}

/* ================= RUN ================= */
home(); tournaments(); tours.forEach(tDetail); shops.forEach(venue); near();
Object.keys(blogs).forEach(blogIndex); articles.filter((a) => blogs[a.blog]).forEach(article);
playersPages(); discPage('pocket', 'pocket'); discPage('carom', 'carom'); discPage('heyball', 'heyball-news');
contentPages(); contact(); order(); guide(); notFound(); feeds();

/* locale copies: same page + dictionary translator (static/i18n) */
const I18N = { en: 'en', ko: 'ko', 'zh-CN': 'zh', vi: 'vi' };
const NO_PREFIX = /^\/(css|js|img|data|apps|i18n|manifest)/;
function localize(html, code, prefix) {
  const file = I18N[code];
  return html
    .replace('<html lang="ja">', `<html lang="${code}">`)
    .replace(/href="(\/[^"]*)"/g, (m, u) => (NO_PREFIX.test(u) || u.startsWith('//') ? m : `href="${prefix}${u}"`))
    .replace(/action="(\/[^"]*)"/g, (m, u) => `action="${prefix}${u}"`)
    .replace('</body>', `<script src="/i18n/vibes-i18n-${file}.js?v=${VER}"></script></body>`);
}
let n = 0;
const urls = [];
for (const [url, v] of out) {
  const html = v.raw ?? v.html;
  write(DIST, url, html); n++;
  if (url !== '/404.html') urls.push(url);
  for (const [code, , prefix] of LANGS.slice(1)) { write(DIST, prefix + (url === '/' ? '/' : url), localize(html, code, prefix)); n++; }
}
const sm = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `<url><loc>${SITE}${encodeURI(decodeURI(u))}</loc></url>`).join('\n')}\n</urlset>`;
fs.writeFileSync(path.join(DIST, 'sitemap.xml'), sm);
fs.writeFileSync(path.join(DIST, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, '_redirects'), [
  '/products/vibes-tee /pages/wear 301', '/collections/* /pages/shaft 301', '/collections /pages/shaft 301', '/cart /pages/shaft 302', '/account* / 302',
  '/blogs/ニュース /blogs/news 301', '/blogs/house /blogs/house-tournament 301', '/pages/pour-femme / 302', '/pages/near-data /data/near.json 302', '/search /pages/tournaments 302',
  '/zh-CN/* /zh/:splat 301', '/zh-cn/* /zh/:splat 301',
].join('\n') + '\n');
/* static hosts without _redirects (GitHub Pages): stub pages for exact redirects, JS for wildcards in 404 */
const STUBS = { '/products/vibes-tee': '/pages/wear', '/collections': '/pages/shaft', '/cart': '/pages/shaft', '/account': '/', '/blogs/ニュース': '/blogs/news', '/blogs/house': '/blogs/house-tournament', '/pages/pour-femme': '/', '/pages/near-data': '/data/near.json', '/search': '/pages/tournaments' };
for (const [from, to] of Object.entries(STUBS)) {
  const f = path.join(DIST, from.slice(1), 'index.html');
  if (fs.existsSync(f)) continue;
  write(DIST, from, `<!doctype html><meta charset="utf-8"><title>移動しました</title><link rel="canonical" href="${SITE}${to}"><meta name="robots" content="noindex"><meta http-equiv="refresh" content="0;url=${to}"><script>location.replace(${JSON.stringify(to)}+location.search+location.hash)</script><a href="${to}">${to}</a>`);
}
{
  const f = path.join(DIST, '404.html');
  const js = `<script>(function(){var p=location.pathname,m;if(/^\\/collections(\\/|$)/.test(p))return location.replace('/pages/shaft');if(/^\\/account/.test(p))return location.replace('/');if((m=p.match(/^\\/zh-cn(\\/.*)?$/i)))return location.replace('/zh'+(m[1]||'/')+location.search);if(p.length>1&&p.slice(-1)==='/')return location.replace(p.slice(0,-1)+location.search);})()</script>`;
  fs.writeFileSync(f, fs.readFileSync(f, 'utf8').replace('<head>', '<head>' + js));
}
fs.writeFileSync(path.join(DIST, '_headers'), `/data/*\n  Cache-Control: public, max-age=300\n/css/*\n  Cache-Control: public, max-age=31536000, immutable\n/js/*\n  Cache-Control: public, max-age=31536000, immutable\n`);
console.log(`built ${n} pages (${out.size} unique) · ${tours.length} tournaments · ${shops.length} venues · ${articles.length} articles · ${players.size} players`);
