// VIBES 3C LAB：動画解析のJSON（ショットの配列）を data/3c-lab.json の shots に足す。
// 使い方：node scripts/lab-shots.mjs 追加分.json
// 検品（取り口15分類への寄せ・秒数の整合）→ 重複の除外（同じ動画で開始が前後3秒以内）→ SHOT-0001〜 の連番を振り直す。
import fs from 'node:fs';
const F = new URL('../data/3c-lab.json', import.meta.url);
const db = JSON.parse(fs.readFileSync(F, 'utf8'));
const add = JSON.parse(fs.readFileSync(process.argv[2], 'utf8').replace(/^﻿/, '').replace(/^[^\[{]*/, '').replace(/[^\]}]*$/, ''));
const P = db.patterns.map(p => p.jp);
const ALIAS = { 'おもてまわし': '表回し', '表まわし': '表回し', '表廻し': '表回し', 'うらまわし': '裏回し', '裏まわし': '裏回し', '裏廻し': '裏回し', 'ひねり': 'ヒネリ', '切り返し': 'ヒネリ', 'きりかえし': 'ヒネリ', 'だぶる': 'ダブル', 'ダブルクッション': 'ダブル', '縦': 'たて', 'タテ': 'たて', '縦取り': 'たて', 'たて取り': 'たて', 'はこ': '箱', 'ハコ': '箱', '箱球': '箱', '空クッション': '空クッション', 'からクッション': '空クッション', '空クッ': '空クッション', 'カラクッション': '空クッション', 'バンクショット': 'バンク', 'てき': 'テキ', 'なめ': 'ナメ', '薄切り': 'ナメ', '押しまわし': '押し回し', '押回し': '押し回し', '引きまわし': '引き回し', '引回し': '引き回し', '傘': 'カサ', 'かさ': 'カサ', 'アンブレラ': 'カサ', 'キスバック': 'キスバック', 'キッスバック': 'キスバック', 'マッセー': 'マッセ' };
const norm = s => String(s || '').normalize('NFKC').replace(/[\s　（(].*$/, '').trim();
function pat(s) {
  const n = norm(s);
  if (P.includes(n)) return n;
  if (ALIAS[n]) return ALIAS[n];
  for (const p of db.patterns) if ([p.en, p.kr].some(v => v && String(v).toLowerCase() === String(s || '').trim().toLowerCase())) return p.jp;
  return P.find(p => n.includes(p)) || Object.keys(ALIAS).filter(k => n.includes(k)).map(k => ALIAS[k])[0] || null;
}
const vid = s => { const m = String(s || '').match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([\w-]{11})/); return m ? m[1] : (/^[\w-]{11}$/.test(String(s || '')) ? String(s) : null); };
const out = db.shots.slice(); let added = 0, skipped = 0, fixed = 0;
for (const r of [].concat(add.shots || add)) {
  const v = vid(r.video_id) || vid(r.embed_url), p = pat(r.pattern_jp) || pat(r.pattern_en) || pat(r.pattern_kr);
  let a = Math.max(0, Math.floor(Number(r.start_sec))), b = Math.floor(Number(r.end_sec));
  if (!v || !p || !Number.isFinite(a)) { skipped++; continue; }
  if (!Number.isFinite(b) || b <= a) { b = a + 12; fixed++; } else if (b - a > 90) { b = a + 90; fixed++; }
  if (p !== r.pattern_jp) fixed++;
  if (out.some(o => o.video_id === v && Math.abs(o.start_sec - a) <= 3)) { skipped++; continue; }
  const s = { shot_id: '', video_id: v, start_sec: a, end_sec: b, pattern_jp: p, cushion_order: String(r.cushion_order || ''), sub_tags: (Array.isArray(r.sub_tags) ? r.sub_tags : []).map(String).slice(0, 6), player_name: String(r.player_name || 'Unknown'), difficulty: Math.max(1, Math.min(5, Math.round(Number(r.difficulty)) || 3)) };
  if (r.is_vibes_original === true) s.is_vibes_original = true;
  out.push(s); added++;
}
out.forEach((s, i) => { s.shot_id = 'SHOT-' + String(i + 1).padStart(4, '0'); });
db.shots = out;
fs.writeFileSync(F, JSON.stringify(db, null, 1) + '\n');
console.log(JSON.stringify({ added, skipped, fixed, total: out.length }));
