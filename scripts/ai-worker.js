// API-only task worker. It proposes file changes; validation and GitHub writes run in other jobs.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { assertNoSecrets, assertSafePaths, validateReport } from './auto-ai-worker.mjs';

const sha = text => crypto.createHash('sha256').update(text).digest('hex');
const DENIED = new Set(['AI_INBOX.md', 'HANDOFF.md', 'AGENTS.md', 'CLAUDE.md', 'AI_RULES.md', 'data/config.json', 'data/lab-codes.json']);
const API = { anthropic: 'https://api.anthropic.com/v1/messages', openai: 'https://api.openai.com/v1/chat/completions' };
export class ProviderError extends Error {
  constructor(provider, kind, status = 0, detail = '') {
    const safeDetail = ['dns', 'timeout', 'tls', 'connection'].includes(detail) ? detail : '';
    super(provider + ': ' + kind + (status ? ' (HTTP ' + status + ')' : '') + (safeDetail ? ' / ' + safeDetail : ''));
    this.provider = provider; this.kind = kind; this.status = status;
    this.detail = safeDetail;
  }
}
function transportDetail(error) {
  const codes = {
    ENOTFOUND: 'dns', EAI_AGAIN: 'dns',
    ETIMEDOUT: 'timeout', UND_ERR_CONNECT_TIMEOUT: 'timeout', UND_ERR_HEADERS_TIMEOUT: 'timeout', UND_ERR_BODY_TIMEOUT: 'timeout',
    ECONNRESET: 'connection', ECONNREFUSED: 'connection', EPIPE: 'connection', UND_ERR_SOCKET: 'connection',
    CERT_HAS_EXPIRED: 'tls', CERT_NOT_YET_VALID: 'tls', DEPTH_ZERO_SELF_SIGNED_CERT: 'tls',
    SELF_SIGNED_CERT_IN_CHAIN: 'tls', UNABLE_TO_VERIFY_LEAF_SIGNATURE: 'tls', ERR_TLS_CERT_ALTNAME_INVALID: 'tls'
  };
  const pending = [error], seen = new Set();
  while (pending.length && seen.size < 16) {
    const item = pending.shift();
    if (!item || typeof item !== 'object' || seen.has(item)) continue;
    seen.add(item);
    if (Object.hasOwn(codes, item.code)) return codes[item.code];
    if (item.name === 'TimeoutError' || item.name === 'AbortError') return 'timeout';
    pending.push(item.cause);
    if (Array.isArray(item.errors)) pending.push(...item.errors.slice(0, 16));
  }
  return '';
}
export function taskRoute(task) {
  const copy = /\[COPY\]/i.test(task.title), dev = /\[DEV\]/i.test(task.title);
  if (copy && dev) throw new Error('[COPY]と[DEV]はどちらか一方を指定してください。');
  return { kind: copy ? 'COPY' : 'DEV', gpt: /\[GPT\]/i.test(task.title) };
}
export function classifyError(provider, status, body = {}) {
  const error = body.error || {}, type = String(error.type || error.code || '');
  const message = String(error.message || '');
  if (status === 402 || type === 'billing_error' || /insufficient_quota|spend_limit|credit_balance/.test(type) ||
    /credit balance.*(?:low|insufficient)|insufficient (?:credits|balance)|(?:spend|usage) limit|quota (?:exceeded|exhausted)/i.test(message)) return 'credit';
  if (status === 401 || status === 403) return 'authentication';
  if (status === 404 && /model/i.test(type + ' ' + message)) return 'model_unavailable';
  if (status === 429 || status >= 500) return 'temporary';
  return 'request';
}
export async function requestAPI(provider, payload, options) {
  const { keys, fetchImpl = fetch, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = options;
  const configuredKey = keys[provider];
  if (!configuredKey) throw new ProviderError(provider, 'missing_key');
  const key = typeof configuredKey === 'string' ? configuredKey.trim() : '';
  if (!key || /[^\x21-\x7e]/.test(key)) throw new ProviderError(provider, 'invalid_key');
  const headers = provider === 'anthropic'
    ? { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' }
    : { 'content-type': 'application/json', authorization: 'Bearer ' + key };
  for (let attempt = 0; attempt < 3; attempt++) {
    let response;
    try {
      response = await fetchImpl(API[provider], { method: 'POST', headers, body: JSON.stringify(payload), signal: AbortSignal.timeout(90000) });
    } catch (error) {
      if (attempt < 2) { await sleep(1000 * (attempt + 1)); continue; }
      throw new ProviderError(provider, 'network', 0, transportDetail(error));
    }
    let body;
    try { body = await response.json(); } catch {
      if ((response.status === 429 || response.status >= 500) && attempt < 2) { await sleep(1000 * (attempt + 1)); continue; }
      throw new ProviderError(provider, 'invalid_response', response.status);
    }
    if (response.ok && !body.error) return body;
    const kind = classifyError(provider, response.status, body);
    if (kind === 'temporary' && attempt < 2) { await sleep(1000 * (attempt + 1)); continue; }
    throw new ProviderError(provider, kind, response.status);
  }
}

function safeFile(repo, file, writing = false) {
  if (typeof file !== 'string' || !file || file.includes('\\') || file.includes('\0')) throw new Error('リポジトリ内の相対パスを指定してください。');
  assertSafePaths([file]);
  const normalized = path.posix.normalize(file);
  if (normalized !== file) throw new Error('./や余分な区切りを付けない相対パスを指定してください。');
  if (DENIED.has(normalized)) throw new Error('ルール・受付・認証用ファイルは自動編集ツールの対象外です。');
  const root = fs.realpathSync(repo), target = path.resolve(root, normalized);
  if (!target.startsWith(root + path.sep)) throw new Error('リポジトリ外は対象外です。');
  let cursor = root;
  for (const part of normalized.split('/')) {
    cursor = path.join(cursor, part);
    let stat;
    try { stat = fs.lstatSync(cursor); } catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (stat?.isSymbolicLink()) throw new Error('シンボリックリンクは対象外です。');
  }
  if (writing && /\.(?:png|jpe?g|webp|gif|mp4|pdf|woff2?|zip)$/i.test(file)) throw new Error('この自動ワーカーはテキストファイルだけを編集します。');
  return target;
}
export class Draft {
  constructor(repo, kind) { this.repo = repo; this.kind = kind; this.changes = new Map(); }
  content(file) {
    const target = safeFile(this.repo, file);
    const content = this.changes.has(file) ? this.changes.get(file) : fs.readFileSync(target, 'utf8');
    if (content.length > 2 * 1024 * 1024 || content.includes('\0')) throw new Error('テキストの読込み上限を超えています。');
    assertNoSecrets(content);
    return content;
  }
  files(prefix = '') {
    if (typeof prefix !== 'string' || prefix.includes('..') || prefix.startsWith('/') || prefix.includes('\\')) throw new Error('不正な検索範囲です。');
    const found = [];
    const visit = (folder, rel = '') => {
      for (const item of fs.readdirSync(folder, { withFileTypes: true })) {
        const name = rel ? rel + '/' + item.name : item.name;
        if (item.isSymbolicLink() || ['.git', 'node_modules', 'dist'].includes(item.name)) continue;
        if (item.isDirectory()) { visit(path.join(folder, item.name), name); continue; }
        try { safeFile(this.repo, name); } catch { continue; }
        if (name.startsWith(prefix)) found.push(name);
      }
    };
    visit(this.repo);
    for (const file of this.changes.keys()) if (file.startsWith(prefix) && !found.includes(file)) found.push(file);
    return found.sort();
  }
  call(name, args) {
    if (name === 'list_files') return { paths: this.files(args.prefix).slice(0, 500) };
    if (name === 'read_file') {
      const content = this.content(args.path), lines = content.split('\n');
      const start = args.start_line, end = args.end_line;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 1 || end < start || end - start > 249) throw new Error('一度に1〜250行を指定してください。');
      return { path: args.path, sha256: sha(content), total_lines: lines.length,
        text: lines.slice(start - 1, end).map((line, index) => (start + index) + ': ' + line).join('\n').slice(0, 32000) };
    }
    if (name === 'search_text') {
      if (typeof args.text !== 'string' || !args.text.trim()) throw new Error('検索語を指定してください。');
      const matches = [];
      for (const file of this.files(args.prefix)) {
        let content; try { content = this.content(file); } catch { continue; }
        for (const [index, line] of content.split('\n').entries()) {
          if (line.includes(args.text)) matches.push({ path: file, line: index + 1, text: line.slice(0, 500) });
          if (matches.length >= 60) return { matches, truncated: true };
        }
      }
      return { matches, truncated: false };
    }
    if (this.kind !== 'DEV') throw new Error('[COPY]ではコードファイルを変更できません。');
    if (name === 'replace_text') {
      safeFile(this.repo, args.path, true);
      if (typeof args.old_text !== 'string' || !args.old_text || typeof args.new_text !== 'string') throw new Error('置換前後の文字列を指定してください。');
      const content = this.content(args.path), first = content.indexOf(args.old_text);
      if (first < 0 || content.indexOf(args.old_text, first + 1) >= 0) throw new Error('置換前の文字列は、ファイル内で1か所だけ一致する必要があります。');
      const next = content.slice(0, first) + args.new_text + content.slice(first + args.old_text.length);
      assertNoSecrets(next); this.changes.set(args.path, next);
      return { proposed: true, path: args.path };
    }
    if (name === 'write_file') {
      const target = safeFile(this.repo, args.path, true);
      if (fs.existsSync(target) || this.changes.has(args.path)) throw new Error('既存ファイルはread_fileとreplace_textで変更してください。');
      if (typeof args.content !== 'string' || !args.content.trim()) throw new Error('新規ファイルの本文が必要です。');
      assertNoSecrets(args.content); this.changes.set(args.path, args.content);
      return { proposed: true, path: args.path };
    }
    throw new Error('不明なツールです。');
  }
  commit() {
    const originals = new Map();
    try {
      for (const [file, content] of this.changes) {
        const target = safeFile(this.repo, file, true);
        originals.set(target, fs.existsSync(target) ? fs.readFileSync(target) : null);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
      }
    } catch (error) {
      for (const [target, before] of originals) {
        if (before === null) fs.rmSync(target, { force: true }); else fs.writeFileSync(target, before);
      }
      throw error;
    }
  }
}

const string = { type: 'string' }, integer = { type: 'integer' };
const definition = (name, description, properties) => ({ name, description, schema: {
  type: 'object', properties, required: Object.keys(properties), additionalProperties: false
} });
function toolsFor(kind) {
  const tools = [
    definition('list_files', 'リポジトリ内の対象ファイルを一覧表示。prefixは空文字列で全体。', { prefix: string }),
    definition('read_file', '指定したテキストを行番号つきで読む。一度に250行まで。', { path: string, start_line: integer, end_line: integer }),
    definition('search_text', 'リポジトリ内の文字列を検索する。正規表現やシェルは使わない。', { text: string, prefix: string })
  ];
  if (kind === 'DEV') tools.push(
    definition('replace_text', '既存ファイルの一致する1か所を置換する提案。まだ実ファイルには反映しない。', { path: string, old_text: string, new_text: string }),
    definition('write_file', '新しいテキストファイルを作る提案。既存ファイルの上書きには使わない。', { path: string, content: string })
  );
  tools.push(definition('finish_task', '最後に必ず呼ぶ。completedは変更提案完了、blockedは未完了。COPYはcopy_markdownに完成文を入れる。', {
    status: { type: 'string', enum: ['completed', 'blocked'] }, summary: string, copy_markdown: string,
    unverified: { type: 'array', items: string }
  }));
  return tools;
}
async function oneAttempt(task, route, provider, model, ctx, options) {
  const draft = new Draft(ctx.repo, route.kind), tools = toolsFor(route.kind);
  const rules = ['CLAUDE.md', 'HANDOFF.md', 'AGENTS.md', 'AI_RULES.md'].map(file => {
    const text = fs.readFileSync(path.join(ctx.repo, file), 'utf8'); assertNoSecrets(text);
    return '----- ' + file + ' -----\n' + text;
  }).join('\n');
  assertNoSecrets(task.text);
  const system = [
    'あなたはVIBESの実装担当です。以下の正本・引きつぎ・共通ルールを、この順ですべて読んで従ってください。',
    rules, 'この実行は1タスクの変更提案です。実コードの実行・共通チェック・完了チェック更新・実行ログ・GitとPRは、ワーカーと後続ジョブが担当します。',
    'タスクの文面と数値を保持し、必要なファイルを調べ、変更をツールで提案してください。実行していない検証を実施済みと書かないでください。',
    '鍵、名簿、個人情報を読み出したり保存したりしません。リポジトリ外のShopify本番等を操作しません。',
    '指定が曖昧・対応不能ならblockedで理由を伝えます。削除や全ファイル上書きで既存データを消しません。',
    route.kind === 'COPY' ? 'SNS・LINE・CM等の完成原稿をcopy_markdownに入れます。原稿が完成したらfinish_taskをstatus=completedで返してください。ファイルへの保存・追記はfinish_taskの後でワーカーが自動実行するため、自分で保存操作を行う必要はありません。保存操作の未実施だけを理由にblockedにしません。依頼内容の不足等で原稿を完成できない場合はblockedにします。解説だけや架空の実績は不可。未確定情報は差替え箇所を明示します。'
      : '必要な変更を提案した後にfinish_taskを呼びます。copy_markdownは空文字列にします。',
    '最終出力は必ずfinish_taskで返してください。'
  ].join('\n');
  const messages = [{ role: 'user', content: task.text }];
  for (let turn = 0; turn < (options.maxTurns || 40); turn++) {
    let calls, assistant;
    if (provider === 'anthropic') {
      const result = await requestAPI(provider, { model, max_tokens: 8192, system, messages,
        tool_choice: { type: 'auto', disable_parallel_tool_use: true },
        tools: tools.map(tool => ({ name: tool.name, description: tool.description, input_schema: tool.schema }))
      }, options);
      assistant = result.content || [];
      messages.push({ role: 'assistant', content: assistant });
      calls = assistant.filter(block => block.type === 'tool_use').map(block => ({ id: block.id, name: block.name, args: block.input }));
    } else {
      const result = await requestAPI(provider, { model, store: false, max_completion_tokens: 8192, parallel_tool_calls: false,
        messages: [{ role: model.startsWith('o') ? 'developer' : 'system', content: system }, ...messages],
        tools: tools.map(tool => ({ type: 'function', function: { name: tool.name, description: tool.description, parameters: tool.schema, strict: true } }))
      }, options);
      assistant = result.choices?.[0]?.message;
      if (!assistant) throw new ProviderError(provider, 'invalid_response');
      messages.push(assistant);
      calls = (assistant.tool_calls || []).map(call => {
        let args; try { args = JSON.parse(call.function.arguments); } catch { args = {}; }
        return { id: call.id, name: call.function.name, args };
      });
    }
    if (!calls.length) { messages.push({ role: 'user', content: '続けて必要なツールを使い、最後はfinish_taskを呼んでください。' }); continue; }
    const results = [];
    for (const call of calls) {
      if (call.name === 'finish_task') {
        const result = call.args;
        if (!['completed', 'blocked'].includes(result.status) || typeof result.summary !== 'string' || !result.summary.trim() ||
          typeof result.copy_markdown !== 'string' || !Array.isArray(result.unverified) ||
          result.unverified.some(value => typeof value !== 'string')) throw new ProviderError(provider, 'invalid_result');
        assertNoSecrets(JSON.stringify(result));
        if (result.status === 'completed' && route.kind === 'COPY' && !result.copy_markdown.trim()) throw new ProviderError(provider, 'empty_copy');
        if (result.status === 'completed' && route.kind === 'DEV' && !draft.changes.size) throw new ProviderError(provider, 'no_changes');
        return { ...result, draft };
      }
      let result;
      try { result = draft.call(call.name, call.args); } catch (error) { result = { error: error.message }; }
      if (provider === 'anthropic') results.push({ type: 'tool_result', tool_use_id: call.id, content: JSON.stringify(result) });
      else messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result) });
    }
    if (provider === 'anthropic') messages.push({ role: 'user', content: results });
  }
  throw new ProviderError(provider, 'turn_limit');
}
export function dateJapan(now = new Date()) {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).format(now);
}
export async function runHybrid(ctx, options = {}) {
  const request = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'request.json'), 'utf8'));
  const keys = { anthropic: ctx.env.ANTHROPIC_API_KEY || '', openai: ctx.env.OPENAI_API_KEY || '' };
  const apiOptions = { ...options, keys };
  const report = { completed: [], blocked: [], checks: [], unverified: [] };
  let claudeUnavailable = false;
  const openAIModel = ctx.env.AI_WORKER_OPENAI_MODEL || 'gpt-4o';
  if (!['gpt-4o', 'o3-mini'].includes(openAIModel)) throw new Error('OpenAIモデルはgpt-4oまたはo3-miniを指定してください。');
  async function attempt(task, route, provider, model) {
    try { return { result: await oneAttempt(task, route, provider, model, ctx, apiOptions), model }; }
    catch (error) {
      if (provider === 'openai' && model === 'o3-mini' && error instanceof ProviderError && error.kind === 'model_unavailable') {
        return { result: await oneAttempt(task, route, provider, 'gpt-4o', ctx, apiOptions), model: 'gpt-4o' };
      }
      throw error;
    }
  }
  for (const task of request.tasks) {
    try {
      const route = taskRoute(task);
      let provider = route.gpt || ctx.env.AI_WORKER_PROVIDER === 'openai' || !keys.anthropic || claudeUnavailable ? 'openai' : 'anthropic';
      let model = provider === 'anthropic' ? ctx.env.AI_WORKER_CLAUDE_MODEL || 'claude-sonnet-5-5' : openAIModel;
      let fallback = false, result;
      try { ({ result, model } = await attempt(task, route, provider, model)); }
      catch (error) {
        if (provider !== 'anthropic' || !(error instanceof ProviderError) || !['credit', 'network'].includes(error.kind)) throw error;
        claudeUnavailable = true; fallback = true; provider = 'openai'; model = openAIModel;
        ({ result, model } = await attempt(task, route, provider, model));
      }
      if (result.status === 'blocked') { report.blocked.push({ id: task.id, reason: result.summary }); continue; }
      const ai = provider === 'anthropic' ? 'Claude' : 'ChatGPT', finishedAt = dateJapan(options.now?.());
      let output = '';
      if (route.kind === 'COPY') {
        output = 'docs/ai-outputs/copy-' + finishedAt.slice(0, 10).replaceAll('-', '') + '.md';
        const target = safeFile(ctx.repo, output, true);
        const previous = fs.existsSync(target) ? fs.readFileSync(target, 'utf8') : '# AI生成原稿 ' + finishedAt.slice(0, 10) + '\n';
        assertNoSecrets(previous);
        result.draft.changes.set(output, previous + '\n## ' + task.title.replace(/[\r\n]/g, ' ') + '\n\n' +
          '実行日時: ' + finishedAt + ' 日本時間 / AI: ' + ai + ' / モデル: ' + model + '\n\n' + result.copy_markdown.trim() + '\n');
      }
      result.draft.commit();
      report.completed.push({ id: task.id, summary: result.summary, validation: 'ファイル変更を生成。独立した共通チェックは後続ジョブで実施します。',
        ai, model, kind: route.kind, output, finishedAt, fallback });
      report.unverified.push(...result.unverified);
    } catch (error) {
      const reasons = { missing_key: 'APIキーが未登録です。',
        invalid_key: 'APIキーに内部の空白・改行・非ASCII文字があるか、値が空です。GitHub Secretsの該当項目を更新してください。',
        authentication: 'API認証または権限を確認してください。',
        credit: 'APIのクレジット・利用上限に達しています。', temporary: 'APIの一時的な制限が再試行後も続いています。',
        network: 'APIとの通信に失敗しました。', model_unavailable: '指定モデルを利用できません。',
        turn_limit: '1タスクの処理回数上限に達しました。タスクを小さく分けてください。' };
      const reason = error instanceof ProviderError
        ? (error.provider === 'anthropic' ? 'Claude' : 'ChatGPT') + ': ' + (reasons[error.kind] || '有効な変更提案を生成できませんでした。') + ' [' + error.message + ']'
        : 'タスクの変更提案を確定できませんでした。設定とタスクの指定を確認してください。';
      report.blocked.push({ id: task.id, reason });
    }
  }
  report.unverified = [...new Set([...report.unverified, '実機操作と本番公開は未確認です。'])];
  validateReport(report, request.tasks);
  fs.writeFileSync(path.join(ctx.dir, 'result.json'), JSON.stringify(report), { mode: 0o600 });
  return report;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ctx = { repo: process.cwd(), env: process.env,
    dir: path.resolve(process.env.AI_WORKER_DIR || path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'auto-ai-worker')) };
  try {
    const report = await runHybrid(ctx);
    console.log('変更提案: ' + report.completed.length + '件 / 未完了: ' + report.blocked.length + '件。共通チェックは後続ジョブで行います。');
  } catch {
    console.error('自動実装を停止しました。受付ファイル・API設定・実行上限を確認してください。キーやAPI応答の値は表示しません。');
    process.exitCode = 1;
  }
}
