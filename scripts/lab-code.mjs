/* DIGITAL LAB の利用コードを発行する：node scripts/lab-code.mjs "お店の名前" [carom|pocket|all]
   12けたのコードを作り、PBKDF2 の値だけを data/lab-codes.json に足す。コードそのものは画面に出すだけで、どこにも保存しない（公開リポジトリに入れない）。
   止めるとき：data/lab-codes.json のその行を "on": false にする。 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const FILE = path.join(ROOT, 'data/lab-codes.json');
const shop = process.argv[2]; const ed = process.argv[3] || 'all';
if (!shop) { console.error('usage: node scripts/lab-code.mjs "お店の名前" [carom|pocket|all]'); process.exit(1); }
const hash = (c) => crypto.pbkdf2Sync(c, 'vibes-digital-lab-v1', 150000, 32, 'sha256').toString('hex');
let code = ''; while (code.length < 12) code += crypto.randomInt(0, 10);
const d = JSON.parse(fs.readFileSync(FILE, 'utf8'));
d.codes.push({ h: hash(code), shop, ed, on: true, issued: new Date().toISOString().slice(0, 10) });
fs.writeFileSync(FILE, JSON.stringify(d, null, 1) + '\n');
console.log(code.replace(/(\d{4})(?=\d)/g, '$1-'));
