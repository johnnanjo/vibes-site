import { esc, svg, SITE, LINE_ADD, LINE_ID, EMAIL } from './util.mjs';

export const VER = Date.now().toString(36);
export const LANGS = [['ja', '日本語', ''], ['en', 'English', '/en'], ['ko', '한국어', '/ko'], ['zh-CN', '中文', '/zh'], ['vi', 'Tiếng Việt', '/vi']];

const NAV = [
  ['/pages/tournaments', '大会', 't'], ['/blogs/news', 'NEWS', 'n'], ['/blogs/results', '結果', 'r'], ['/blogs/live', '試合速報', 'l'],
  ['/pages/players', '選手', 'p'], ['/pages/pocket', 'ポケット', 'pk'], ['/pages/carom', 'キャロム', 'cr'], ['/pages/heyball-news', 'ヘイボール', 'hb'],
  ['/pages/near', 'ビリヤード場', 's'], ['/pages/live-table', 'デジタルカウント', 'c'],
];

const TABS = [['/', 'ホーム', 'home', 'home'], ['/blogs/live', '速報', 'camera', 'l'], ['/pages/tournaments', '大会', 'cal', 't'], ['/blogs/results', '結果', 'trophy', 'r'], ['/pages/players', '選手', 'user', 'p']];

const MENU = [
  ['大会・結果', [['/pages/tournaments', '大会をさがす', 'エリア・種目・クラスで絞り込み'], ['/blogs/news', 'NEWS', '公式戦スケジュール・エントリー情報'], ['/blogs/results', '試合結果', '公式戦／ハウストーナメント'], ['/blogs/house-tournament', 'ハウストーナメント', '各店の大会情報'], ['/blogs/live', '試合速報', '会場からLINEで届く速報'], ['/pages/players', '選手', '結果が選手ごとにたまる']]],
  ['種目', [['/pages/pocket', 'ポケット', '大会・NEWS・試合結果'], ['/pages/carom', 'キャロム（スリークッション）', '大会・NEWS・試合結果'], ['/pages/heyball-news', 'ヘイボール', '大会・NEWS・試合結果']]],
  ['ビリヤード場', [['/pages/near', '近くのビリヤード場', '現在地・駅名・店名から検索']]],
  ['ツール', [['/pages/live-table', 'デジタルカウント', 'キャロム版・ポケット版'], ['/pages/count-3c', 'スリークッション カウント（モニター用）', 'PCのモニター＋テンキーで操作'], ['/pages/app', 'VIBESアプリ', 'ホーム画面に追加'], ['/pages/nine-drop', 'NINE DROP', 'ナインボールのパズル']]],
  ['はじめての方へ', [['/pages/guide', '大会に出てみよう ガイド', '級の見方・申し込みの流れ'], ['/pages/heyball', 'HEYBALL（ヘイボール）とは？', ''], ['/pages/jpa', 'JPA（プールリーグ）とは？', ''], ['/pages/kids', 'VIBES BILLIARDS -KIDS-', '子どもと楽しむビリヤード']]],
  ['SHOP', [['/pages/shaft', 'Vibes Carbon Shaft', 'パターンオーダー ¥25,000'], ['/pages/wear', 'Wear Vibes', 'オフィシャルTシャツ'], ['/pages/shaft#maintenance', 'メンテナンス', 'タップ交換 ¥1,000〜'], ['/pages/shaft#faq', 'よくある質問', '']]],
  ['ビリヤード場の方へ', [['/pages/tournament-form', 'ハウストーナメント掲載フォーム', '大会を全国に告知'], ['/blogs/live', '結果・速報をLINEで送る', '写真を送るだけ']]],
];

export function head({ title, desc, path, image, noindex, extraHead = '', legacy = false }) {
  const full = title ? `${title}｜VIBES BILLIARDS` : 'VIBES BILLIARDS｜日本のビリヤード大会・試合結果・ビリヤード場';
  const d = desc || '全国の公式戦とハウストーナメントの予定・試合結果、ビリヤード場検索、デジタルカウント。日本のビリヤード情報ポータル。';
  const img = image || `${SITE}/img/og-default.png`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>${esc(full)}</title>
<meta name="description" content="${esc(d)}">
<link rel="canonical" href="${SITE}${esc(path)}">
${noindex ? '<meta name="robots" content="noindex">' : ''}
<meta property="og:type" content="website"><meta property="og:site_name" content="VIBES BILLIARDS">
<meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(d)}">
<meta property="og:url" content="${SITE}${esc(path)}"><meta property="og:image" content="${esc(img)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#171A22">
<link rel="icon" type="image/png" href="/img/favicon-64.png"><link rel="apple-touch-icon" href="/img/icon-180.png"><link rel="manifest" href="/manifest.webmanifest">
${LANGS.map(([c, , p]) => `<link rel="alternate" hreflang="${c}" href="${SITE}${p}${esc(path)}">`).join('')}
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Anton&family=Noto+Sans+JP:wght@400;500;700;900&display=swap">
${legacy ? `<link rel="stylesheet" href="/css/legacy/vibes-home.css?v=${VER}"><link rel="stylesheet" href="/css/legacy/vibes-v21.css?v=${VER}">` : ''}
<link rel="stylesheet" href="/css/vibes.css?v=${VER}">
${extraHead}
</head>
<body>`;
}

export function header(cur) {
  return `<header class="hd"><div class="wrap">
<div class="hd-top">
<a class="hd-logo" href="/" aria-label="VIBES BILLIARDS トップ"><img src="/img/vibes-logo.png" alt="VIBES BILLIARDS" width="71" height="40"></a>
<form class="hd-search" action="/pages/tournaments" role="search">${svg('search', 18, '#A3A8B5')}<input type="search" name="q" placeholder="大会・ビリヤード場を検索" aria-label="大会・ビリヤード場を検索"></form>
<div class="hd-act">
<a class="pbtn" href="#lang" data-open-menu aria-label="言語を切り替える">JP / EN</a>
<a class="pbtn" href="${LINE_ADD}" target="_blank" rel="noopener" style="display:none" data-desk>LINEで受け取る</a>
<button type="button" class="ibtn menu-btn" data-open-menu aria-label="メニュー">${svg('menu')}</button>
</div></div>
<nav class="hd-nav" aria-label="メイン">${NAV.map(([h, l, k]) => `<a href="${h}"${k === cur ? ' class="cur" aria-current="page"' : ''}>${l}</a>`).join('')}<a class="dim" href="/pages/shaft">ショップ</a><button type="button" class="pbtn" data-open-menu style="min-height:28px;padding:0 10px">すべて</button></nav>
</div></header>`;
}

export function notice() {
  return `<div class="notice"><div class="wrap"><a href="/blogs/live"><span class="badge b-off">試合速報</span><span>会場からスコア表・トーナメント表の写真をLINEで送ろう。確認してすぐ掲載します。</span><span class="more">送り方 ›</span></a></div></div>`;
}

export function drawer() {
  return `<div class="drawer" id="drawer" hidden role="dialog" aria-modal="true" aria-label="メニュー"><div class="drawer-in">
<div style="display:flex;align-items:center;justify-content:space-between"><img src="/img/vibes-logo.png" alt="VIBES BILLIARDS" style="height:40px;width:auto"><button type="button" class="ibtn" data-close-menu aria-label="メニューを閉じる">${svg('close')}</button></div>
${MENU.map(([g, items]) => `<section><h2>${g}</h2><div class="dgrp">${items.map(([h, t, d]) => `<a href="${h}"><span><b>${t}</b>${d ? `<small>${d}</small>` : ''}</span>${svg('next', 16, '#A3A8B5', 2.4)}</a>`).join('')}</div></section>`).join('')}
<a class="btn btn-lineapp btn-block" href="${LINE_ADD}" target="_blank" rel="noopener">公式LINEを友だち追加（${LINE_ID}）</a>
<div class="langs" id="lang" data-langs>${LANGS.map(([c, n, p]) => `<a href="${p || ""}/" data-lang="${c}" data-prefix="${p}">${n}</a>`).join('')}</div>
<div style="display:flex;flex-wrap:wrap;gap:6px 16px;font-size:12px"><a href="/pages/contact" style="color:#A3A8B5">お問い合わせ</a><a href="/pages/legal-notice" style="color:#A3A8B5">特定商取引法に基づく表記</a><a href="/pages/privacy-policy" style="color:#A3A8B5">プライバシーポリシー</a><a href="/pages/refund-policy" style="color:#A3A8B5">返品・交換ポリシー</a></div>
</div></div>`;
}

export function tabbar(cur) {
  return `<nav class="tabbar" aria-label="タブ">${TABS.map(([h, l, i, k]) => `<a href="${h}"${k === cur ? ' class="cur" aria-current="page"' : ''}>${svg(i, 20, 'currentColor', k === cur ? 2.2 : 2)}${l}</a>`).join('')}</nav>`;
}

const RACK = ['b1', 'b2', 'b3', 'b5', 'b7', 'b6', 'b4', 'b8'];
export function footer() {
  const cols = [
    ['/pages/tournaments', '大会をさがす'], ['/pages/pocket', 'ポケット'], ['/pages/near', '近くのビリヤード場'], ['/pages/tournament-form', 'ハウストーナメント掲載フォーム'],
    ['/blogs/news', 'NEWS'], ['/pages/carom', 'キャロム'], ['/pages/live-table', 'デジタルカウント'], ['/pages/contact', 'お問い合わせ'],
    ['/blogs/results', '試合結果'], ['/pages/heyball-news', 'ヘイボール'], ['/pages/app', 'VIBESアプリ'], ['/pages/legal-notice', '特定商取引法に基づく表記'],
    ['/blogs/house-tournament', 'ハウストーナメント'], ['/pages/heyball', 'HEYBALLとは'], ['/pages/shaft', 'カーボンシャフト'], ['/pages/privacy-policy', 'プライバシーポリシー'],
    ['/blogs/live', '試合速報'], ['/pages/jpa', 'JPAとは'], ['/pages/wear', 'Wear Vibes'], ['/pages/refund-policy', '返品・交換ポリシー'],
    ['/pages/players', '選手'], ['/pages/kids', 'KIDS'], ['/pages/guide', '大会に出てみよう'], ['/pages/nine-drop', 'NINE DROP'],
    ['/pages/count-3c', '3C カウント（モニター用）'],
  ];
  return `<footer class="ft">
<div class="rack-line" aria-hidden="true">${RACK.map((b) => `<span style="background:var(--${b})"></span>`).join('')}</div>
<div class="wrap ft-in">
<div class="rack" aria-hidden="true">${RACK.map((b) => `<i style="background:var(--${b})${b === 'b8' ? ';box-shadow:0 0 0 1px #3A3F4C' : ''}"></i>`).join('')}</div>
<a class="ft-logo" href="/"><img src="/img/vibes-logo.png" alt="VIBES BILLIARDS" width="78" height="44"></a>
<a class="btn btn-lineapp btn-sm" href="${LINE_ADD}" target="_blank" rel="noopener">公式LINEを友だち追加（${LINE_ID}）</a>
<div class="ft-links">${cols.map(([h, l]) => `<a href="${h}">${l}</a>`).join('')}</div>
<p>日本語・English・한국어・中文・Tiếng Việt　／　${EMAIL}　© VIBES BILLIARDS</p>
</div></footer>`;
}

export function page({ title, desc, path, image, cur, body, noindex, extraHead, scripts = '', legacy, bare }) {
  return head({ title, desc, path, image, noindex, extraHead, legacy }) + (bare ? '' : header(cur)) + body + (bare ? '' : footer() + tabbar(cur) + drawer()) +
    `<script src="/js/site.js?v=${VER}" defer></script>${scripts}</body></html>`;
}
