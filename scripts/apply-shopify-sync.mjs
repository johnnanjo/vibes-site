#!/usr/bin/env node
/* Shopify → 新サイト同期の取り込み。
   使い方: node scripts/apply-shopify-sync.mjs <GraphQLの結果ファイル>...
   各ファイルは metaobjects クエリの結果（aliasは t=tournament, s=shop。nodes{id handle updatedAt capabilities{publishable{status}} fields{key value}}）。
   先頭に説明文が付いていても、最初の { から読む。MCPのツール結果ファイル（[{type,text}] 形式）も可。
   出力: data/inbox/tournaments/sync-YYYYMMDDHHMM.json と data/inbox/shops/sync-…json（配列）、data/sync-state.json を更新。 */
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const parse = (txt) => {
  txt = txt.trim();
  try { const j = JSON.parse(txt); if (Array.isArray(j) && j[0]?.text) return parse(j.map((x) => x.text).join('\n')); return j; } catch {}
  const i = txt.indexOf('{'); return JSON.parse(txt.slice(i));
};
const T = new Map(), S = new Map();
let maxU = '';
for (const f of process.argv.slice(2)) {
  const j = parse(fs.readFileSync(f, 'utf8'));
  const d = j.data || j;
  for (const [alias, conn] of Object.entries(d)) {
    if (!conn || !Array.isArray(conn.nodes)) continue;
    for (const n of conn.nodes) {
      const o = { handle: n.handle, id: n.id, updatedAt: n.updatedAt };
      for (const fl of n.fields || []) o[fl.key] = fl.value;
      if (n.updatedAt > maxU) maxU = n.updatedAt;
      const isTour = alias.startsWith('t') || 'starts_at' in o;
      if (isTour) { o.status = n.capabilities?.publishable?.status || 'ACTIVE'; T.set(o.handle, o); } else S.set(o.handle, o);
    }
  }
}
const stamp = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 16).replace(/[-:T]/g, '');
const out = (kind, m) => { if (!m.size) return 0; const p = path.join(root, 'data/inbox', kind, `sync-${stamp}.json`); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, JSON.stringify([...m.values()], null, 1)); return m.size; };
const nt = out('tournaments', T), ns = out('shops', S);
const stateFile = path.join(root, 'data/sync-state.json');
let st = {}; try { st = JSON.parse(fs.readFileSync(stateFile, 'utf8')); } catch {}
if (maxU && (!st.metaobjects || maxU > st.metaobjects)) st.metaobjects = maxU;
st.lastRun = new Date().toISOString();
fs.writeFileSync(stateFile, JSON.stringify(st, null, 1) + '\n');
console.log(JSON.stringify({ tournaments: nt, shops: ns, since: st.metaobjects }));
