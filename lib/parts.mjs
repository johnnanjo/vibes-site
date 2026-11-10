import { esc, svg, md, hm, wdEn, wdOf, mdJa, ball, LINE_ADD } from './util.mjs';
import { GAME, CLS, DISC, ENTRY } from './data.mjs';

export const catBadge = (t) => t.cat === 'official' ? '<span class="badge b-off">公式戦</span>' : t.cat === 'event' ? '<span class="badge b-ev">イベント</span>' : '<span class="badge b-house">ハウス</span>';
export const fdot = (disc) => `<span class="fdot f-${disc}" aria-hidden="true"></span>`;
export const gamesLabel = (t) => t.games.map((g) => GAME[g] || g).filter((g) => g !== 'その他').join('・') || DISC[t.disc].ja;
export const classLabel = (t) => t.classes.map((c) => CLS[c] || c).join('・');

export function tRow(t, { showDate = false } = {}) {
  const st = t.dead ? ` <span class="badge b-closed">${ENTRY[t.entry_status]}</span>` : '';
  const left = showDate ? `<span class="tm" style="font-size:18px">${md(t.d)}</span>` : `<span class="tm">${hm(t.s)}</span>`;
  const place = [t.venue, t.pref].filter(Boolean).join('・');
  return `<a class="row" href="${t.url}">${left}<span style="min-width:0"><span class="tt">${esc(t.title)}${st}</span><span class="vv">${esc(place)}</span></span><span class="vv2">${esc(place)}</span><span class="tag">${catBadge(t)}</span></a>`;
}

export function rRow(t) {
  const lbl = t.winner ? '優勝' : '結果';
  const w = t.winner || (t.results ? '結果を見る' : '');
  return `<a class="rrow" href="${t.url}"><span style="min-width:0"><span class="k">${fdot(t.disc)}${t.cat === 'official' ? '公式戦' : 'ハウス'}・${DISC[t.disc].ja}</span><span class="t">${esc(t.title)}</span></span><span class="w"><small>${lbl}</small>${esc(w)}</span></a>`;
}

export function nRow(a) {
  return `<a class="nrow" href="${a.url}"><span class="d">${md(a.date)}</span><span class="t">${esc(a.title)}</span></a>`;
}

export function pCard(p) {
  const w = p.wins[0];
  return `<a class="pcard" href="${encodeURI(p.url)}">${ball(p.name, p.disc === 'carom')}<span class="nm">${esc(p.name)}</span><span class="lt">${md(w.d)} ${esc(w.title)} 優勝</span></a>`;
}

export function nextOfficial(t, today, days) {
  return `<a class="next" href="${t.url}">
<span class="eyebrow-l">次の公式戦まで あと${days}日</span>
<span class="bigdate"><b>${md(t.d)}</b><span>${wdEn(wdOf(t.d))}</span></span>
<span class="hero-title">${esc(t.title)}</span>
<span class="hero-sub">${esc([t.venue, t.pref].filter(Boolean).join('（') + (t.pref && t.venue ? '）' : ''))}・${esc(DISC[t.disc].ja)} ${esc(gamesLabel(t))}</span></a>`;
}

export function oRow(t, today, daysTo) {
  return `<a class="orow" href="${t.url}"><span class="d">${md(t.d)}</span><span style="min-width:0"><span class="g">${esc(DISC[t.disc].ja)}・${esc(gamesLabel(t))}</span><span class="t">${esc(t.title)}</span><span class="v">${esc(t.venue)}${t.pref ? `（${esc(t.pref)}）` : ''}</span></span><span class="left">あと${daysTo}日</span></a>`;
}

export function todayBlock() {
  return `<div id="vb-week" class="sec" style="padding-top:0">
<a class="today" href="/pages/tournaments?date=today"><span class="lb">今日の大会</span><b data-wk-n>–<small>件</small></b><span class="go">一覧 ›</span></a>
<div class="card wx" id="vb-wx">${svg('sun', 44, 'currentColor', 1.8).replace('<svg', '<svg data-wx-ic')}
<span class="l1"><b data-wx-pl>天気を読み込み中</b><span class="now" data-wx-now></span><span class="hl" data-wx-hl></span><select data-wx-sel aria-label="天気の地域"></select></span>
<span class="tip" data-wx-msg></span></div>
<div class="week" data-wk-days></div>
<p class="muted" style="font-size:10px">天気：Open-Meteo</p>
</div>`;
}

export function transitBlock(to = '', title = '乗換案内', sub = '電車でお店へ') {
  return `<form class="card tr" data-tr-form>
<span class="tr-h"><b>${esc(title)}</b><span>${esc(sub)}</span></span>
<div class="tr-g">
<label class="tr-f"><i>出発</i><input type="text" name="from" placeholder="出発駅（空欄なら現在地）" aria-label="出発駅" autocomplete="off"></label>
<button type="button" class="tr-sw" data-tr-sw aria-label="出発と到着を入れ替える">⇅</button>
<label class="tr-f"><i class="to">到着</i><input type="text" name="to" placeholder="お店の最寄り駅（例：志木）" aria-label="到着駅" value="${esc(to)}" autocomplete="off"></label>
</div>
<div class="tr-b"><button type="button" class="btn btn-dark btn-sm" data-tr="yahoo">Yahoo!乗換案内</button><button type="button" class="btn btn-line btn-sm" data-tr="google">Googleマップ</button></div>
<p class="tr-msg" data-tr-msg aria-live="polite"></p>
</form>`;
}

export function discTiles() {
  return `<div class="disc">
<a class="bg-pocket" href="/pages/pocket"><span class="en">POCKET</span><span class="ja">ポケット<small>大会・NEWS・結果</small></span></a>
<a class="bg-carom" href="/pages/carom"><span class="en">CAROM</span><span class="ja">キャロム<small>大会・NEWS・結果</small></span></a>
<a class="bg-heyball" href="/pages/heyball-news"><span class="en">HEYBALL</span><span class="ja">ヘイボール<small>大会・NEWS・結果</small></span></a>
</div>`;
}

export function shopCta() {
  return `<div class="band-lime"><div style="display:flex;flex-direction:column;gap:8px"><span class="k">ビリヤード場の方へ</span><span class="t">大会の告知も結果も、LINEで送るだけで全国に載ります。</span></div>
<div style="display:flex;flex-direction:column;gap:10px"><p style="font-size:14px;line-height:1.75">要項やトーナメント表の写真を送ってください。VIBESが確認して、大会ページと結果を作ります。週3回のLINE配信でも告知されます。</p>
<div class="btns"><a class="btn btn-dark" href="${LINE_ADD}" target="_blank" rel="noopener">LINEで大会を送る</a><a class="btn btn-line" href="/pages/tournament-form">掲載フォーム</a></div></div></div>`;
}

export function dayGroup(ymd, list) {
  return `<div class="daygrp"><h3>${mdJa(ymd)}<small>${list.length}件</small></h3><div class="card list">${list.map((t) => tRow(t)).join('')}</div></div>`;
}
