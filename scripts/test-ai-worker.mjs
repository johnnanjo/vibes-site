import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { runHybrid, taskRoute, classifyError, requestAPI, Draft, dateJapan } from './ai-worker.js';
import { prepare, exportDraft, validateDraft } from './auto-ai-worker.mjs';

const git = (repo, ...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: 'pipe' });
function fixture(tasks) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibes-hybrid-test-')), repo = path.join(root, 'repo'), dir = path.join(root, 'run');
  fs.mkdirSync(repo);
  const files = {
    'AI_INBOX.md': '# 受付\n\n## 未処理\n' + tasks.map(task => '- [ ] ' + task).join('\n') + '\n',
    'CLAUDE.md': '# 正本\n指定された数値と文面を保持します。\n',
    'AGENTS.md': '# 共通\nPRで反映する。\n',
    'AI_RULES.md': '# ブランド\nプレクイーン7点・10点とW3C25点を保持する。\n',
    'HANDOFF.md': '# 引きつぎ\n\n## 作業中\n| だれが | 何を | 触るファイル | いつから |\n| --- | --- | --- | --- |\n| （なし） | | | |\n\n## 記録\n',
    '.gitignore': 'dist/\n',
    'build.mjs': 'import fs from "node:fs";fs.mkdirSync("dist",{recursive:true});fs.writeFileSync("dist/environment.json",JSON.stringify({anthropic:!!process.env.ANTHROPIC_API_KEY,openai:!!process.env.OPENAI_API_KEY}));'
  };
  for (const [file, content] of Object.entries(files)) fs.writeFileSync(path.join(repo, file), content);
  git(repo, 'init', '-q'); git(repo, 'config', 'user.name', 'Fixture'); git(repo, 'config', 'user.email', 'fixture@example.invalid');
  git(repo, 'add', '.'); git(repo, 'commit', '-qm', 'base');
  const ctx = { repo, dir, openPRs: [], env: { ...process.env, ANTHROPIC_API_KEY: 'unit-anthropic',
    OPENAI_API_KEY: 'unit-openai', GITHUB_OUTPUT: path.join(root, 'outputs'), GITHUB_RUN_ID: '789', GITHUB_RUN_ATTEMPT: '1' } };
  prepare(ctx);
  return { ...ctx, root, cleanup() { fs.rmSync(root, { recursive: true, force: true }); } };
}
const response = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });
function tool(provider, name, args) {
  return provider === 'anthropic'
    ? response(200, { content: [{ type: 'tool_use', id: 'call-unit', name, input: args }] })
    : response(200, { choices: [{ message: { role: 'assistant', content: null,
      tool_calls: [{ id: 'call-unit', type: 'function', function: { name, arguments: JSON.stringify(args) } }] } }] });
}
const finish = (provider, copy = '') => tool(provider, 'finish_task', { status: 'completed', summary: '指定どおり作成しました',
  copy_markdown: copy, unverified: ['実機は未確認'] });
const options = fetchImpl => ({ fetchImpl, sleep: async () => {}, now: () => new Date('2026-11-20T00:00:00Z') });
const providerOf = url => url.includes('anthropic') ? 'anthropic' : 'openai';

test('tag routing supports GPT combined with COPY or DEV and defaults to DEV', () => {
  assert.deepEqual(taskRoute({ title: '[GPT] [COPY] LINE文' }), { kind: 'COPY', gpt: true });
  assert.deepEqual(taskRoute({ title: '[DEV] ボタン修正' }), { kind: 'DEV', gpt: false });
  assert.deepEqual(taskRoute({ title: 'ボタン修正' }), { kind: 'DEV', gpt: false });
  assert.throws(() => taskRoute({ title: '[COPY] [DEV] 競合' }));
});
test('billing errors are distinguished from authentication and temporary rate limits', () => {
  assert.equal(classifyError('anthropic', 402, { error: { type: 'billing_error' } }), 'credit');
  assert.equal(classifyError('anthropic', 400, { error: { type: 'invalid_request_error', message: 'Your credit balance is too low to access the Anthropic API.' } }), 'credit');
  assert.equal(classifyError('anthropic', 401), 'authentication');
  assert.equal(classifyError('anthropic', 429, { error: { type: 'rate_limit_error' } }), 'temporary');
});
test('Claude is preferred and receives the API authentication header', async () => {
  const ctx = fixture(['[DEV] JavaScriptを追加']);
  try {
    let calls = 0;
    const report = await runHybrid(ctx, options(async (url, init) => {
      assert.equal(providerOf(url), 'anthropic');
      assert.equal(typeof init.headers['x-api-key'], 'string');
      assert.equal(init.headers['anthropic-version'], '2023-06-01');
      assert(JSON.parse(init.body).system.includes('プレクイーン7点・10点とW3C25点を保持する。'));
      return calls++ === 0 ? tool('anthropic', 'write_file', { path: 'demo.js', content: 'export const value=1;\n' }) : finish('anthropic');
    }));
    assert.equal(report.completed[0].ai, 'Claude');
    assert.equal(fs.readFileSync(path.join(ctx.repo, 'demo.js'), 'utf8'), 'export const value=1;\n');
    assert(fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8').includes('- [ ]'));
  } finally { ctx.cleanup(); }
});
test('GPT tag bypasses Claude and COPY is saved to the required dated file', async () => {
  const ctx = fixture(['[GPT] [COPY] 大会告知を作成']);
  try {
    const report = await runHybrid(ctx, options(async (url, init) => {
      assert.equal(providerOf(url), 'openai'); assert.match(init.headers.authorization, /^Bearer /);
      const body = JSON.parse(init.body); assert.equal(body.model, 'gpt-4o');
      assert.equal(body.max_completion_tokens, 8192); assert.equal('temperature' in body, false);
      assert.equal(body.tools.some(tool => tool.function.name === 'write_file'), false);
      return finish('openai', '大会の配信をお届けします。\n公式LINEからご覧ください。');
    }));
    assert.equal(report.completed[0].ai, 'ChatGPT');
    assert.equal(report.completed[0].output, 'docs/ai-outputs/copy-20261120.md');
    assert.match(fs.readFileSync(path.join(ctx.repo, report.completed[0].output), 'utf8'), /大会の配信/);
  } finally { ctx.cleanup(); }
});
test('multiple COPY tasks append to the same daily document without replacing earlier output', async () => {
  const ctx = fixture(['[COPY] LINE', '[COPY] CM']);
  try {
    let index = 0;
    const report = await runHybrid(ctx, options(async () => finish('anthropic', '完成原稿' + (++index))));
    assert.equal(report.completed.length, 2);
    const text = fs.readFileSync(path.join(ctx.repo, 'docs/ai-outputs/copy-20261120.md'), 'utf8');
    assert.match(text, /完成原稿1/); assert.match(text, /完成原稿2/);
  } finally { ctx.cleanup(); }
});
test('credit exhaustion discards Claude draft changes and restarts the task with OpenAI', async () => {
  const ctx = fixture(['[DEV] 変更', '[COPY] 告知']);
  try {
    let claude = 0, openai = 0;
    const report = await runHybrid(ctx, options(async url => {
      if (providerOf(url) === 'anthropic') {
        return claude++ === 0 ? tool('anthropic', 'write_file', { path: 'demo.js', content: 'unfinished Claude draft' })
          : response(402, { error: { type: 'billing_error', message: 'credit balance too low' } });
      }
      const count = openai++;
      if (count === 0) return tool('openai', 'write_file', { path: 'demo.js', content: 'export const completedByGPT=true;\n' });
      if (count === 1) return finish('openai');
      return finish('openai', '切替後の告知原稿');
    }));
    assert.equal(report.completed.length, 2); assert.equal(report.completed[0].fallback, true);
    assert.equal(report.completed[0].ai, 'ChatGPT'); assert.equal(report.completed[1].ai, 'ChatGPT');
    assert.equal(claude, 2);
    assert.match(fs.readFileSync(path.join(ctx.repo, 'demo.js'), 'utf8'), /completedByGPT/);
    assert.doesNotMatch(fs.readFileSync(path.join(ctx.repo, 'demo.js'), 'utf8'), /unfinished/);
  } finally { ctx.cleanup(); }
});
test('invalid Claude credentials do not silently switch providers or complete the task', async () => {
  const ctx = fixture(['[COPY] 告知']);
  try {
    const report = await runHybrid(ctx, options(async url => {
      assert.equal(providerOf(url), 'anthropic'); return response(401, { error: { message: 'invalid key' } });
    }));
    assert.equal(report.completed.length, 0); assert.equal(report.blocked.length, 1);
    assert.match(report.blocked[0].reason, /authentication/);
  } finally { ctx.cleanup(); }
});
test('a missing OpenAI key keeps GPT-tagged tasks pending without calling Claude', async () => {
  const ctx = fixture(['[GPT] [COPY] 告知']);
  try {
    ctx.env.OPENAI_API_KEY = '';
    const report = await runHybrid(ctx, options(async () => { throw new Error('must not call API'); }));
    assert.equal(report.completed.length, 0); assert.match(report.blocked[0].reason, /missing_key/);
  } finally { ctx.cleanup(); }
});
test('OpenAI handles untagged DEV tasks when no Claude key is configured', async () => {
  const ctx = fixture(['UIの文言を修正']);
  try {
    ctx.env.ANTHROPIC_API_KEY = '';
    fs.writeFileSync(path.join(ctx.repo, 'ui.html'), '<button>前</button>\n');
    let count = 0;
    const report = await runHybrid(ctx, options(async url => {
      assert.equal(providerOf(url), 'openai');
      return count++ === 0 ? tool('openai', 'replace_text', { path: 'ui.html', old_text: '>前<', new_text: '>次<' }) : finish('openai');
    }));
    assert.equal(report.completed[0].ai, 'ChatGPT'); assert.equal(report.completed[0].kind, 'DEV');
    assert.match(fs.readFileSync(path.join(ctx.repo, 'ui.html'), 'utf8'), /次/);
  } finally { ctx.cleanup(); }
});
test('blocked work remains pending while later independent tasks can complete', async () => {
  const ctx = fixture(['[DEV] 未確定の変更', '[COPY] 確定済みの告知']);
  try {
    let count = 0;
    const report = await runHybrid(ctx, options(async () => ++count === 1 ? tool('anthropic', 'finish_task', {
      status: 'blocked', summary: '表示する文面が未指定です', copy_markdown: '', unverified: []
    }) : finish('anthropic', '確定済みの大会告知')));
    assert.equal(report.blocked.length, 1); assert.equal(report.completed.length, 1);
    assert.equal(report.completed[0].kind, 'COPY');
    assert.equal(fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8').includes('- [x]'), false);
  } finally { ctx.cleanup(); }
});
test('a temporary 429 is retried on the same API instead of treated as depleted credits', async () => {
  let calls = 0;
  const result = await requestAPI('anthropic', {}, { keys: { anthropic: 'unit-only' }, sleep: async () => {},
    fetchImpl: async () => ++calls < 3 ? response(429, { error: { type: 'rate_limit_error' } }) : response(200, { ok: true }) });
  assert.equal(calls, 3); assert.equal(result.ok, true);
});
test('a temporary gateway failure with an HTML body can recover on retry', async () => {
  let calls = 0;
  const result = await requestAPI('openai', {}, { keys: { openai: 'unit-only' }, sleep: async () => {},
    fetchImpl: async () => ++calls === 1 ? { ok: false, status: 502, json: async () => { throw new Error('HTML response'); } }
      : response(200, { ok: true }) });
  assert.equal(calls, 2); assert.equal(result.ok, true);
});
test('clipboard whitespace around API keys is removed before building authentication headers', async () => {
  for (const provider of ['anthropic', 'openai']) {
    let calls = 0;
    await requestAPI(provider, {}, { keys: { [provider]: ' \nunit-copy-key\r\n ' }, fetchImpl: async (_url, init) => {
      calls++;
      const headers = new Headers(init.headers);
      assert.equal(headers.get(provider === 'anthropic' ? 'x-api-key' : 'authorization'),
        provider === 'anthropic' ? 'unit-copy-key' : 'Bearer unit-copy-key');
      return response(200, { ok: true });
    } });
    assert.equal(calls, 1);
  }
});
test('invalid key characters are diagnosed before fetch without printing the key value', async () => {
  assert.throws(() => new Headers({ 'x-api-key': '貼付け文字' }), TypeError);
  for (const key of ['unit\nsecond-line', 'unit key', '貼付け文字', ' \n ']) {
    let calls = 0;
    await assert.rejects(requestAPI('anthropic', {}, { keys: { anthropic: key }, fetchImpl: async () => { calls++; } }), error => {
      assert.equal(error.kind, 'invalid_key');
      assert.equal(error.message, 'anthropic: invalid_key');
      return true;
    });
    assert.equal(calls, 0);
  }
});
test('failed network retries report only fixed DNS, timeout, TLS or connection categories', async () => {
  for (const [code, detail] of [['ENOTFOUND', 'dns'], ['UND_ERR_CONNECT_TIMEOUT', 'timeout'],
    ['CERT_HAS_EXPIRED', 'tls'], ['ECONNRESET', 'connection']]) {
    let calls = 0;
    const cause = Object.assign(new Error('private-header-canary'), { code });
    await assert.rejects(requestAPI('anthropic', {}, { keys: { anthropic: 'unit-only' }, sleep: async () => {},
      fetchImpl: async () => { calls++; throw new TypeError('private-key-canary', { cause: new AggregateError([cause]) }); } }), error => {
      assert.equal(error.kind, 'network'); assert.equal(error.detail, detail);
      assert.doesNotMatch(error.message, /private|canary/);
      return true;
    });
    assert.equal(calls, 3);
  }
  await assert.rejects(requestAPI('openai', {}, { keys: { openai: 'unit-only' }, sleep: async () => {},
    fetchImpl: async () => { throw new DOMException('private-timeout-canary', 'TimeoutError'); } }),
  error => error.kind === 'network' && error.detail === 'timeout' && !error.message.includes('canary'));
});
test('persistent Claude connection failure discards its partial draft and continues on OpenAI', async () => {
  const ctx = fixture(['[DEV] 変更', '[COPY] 告知']);
  try {
    let claude = 0, openai = 0;
    const report = await runHybrid(ctx, options(async url => {
      if (providerOf(url) === 'anthropic') {
        if (++claude === 1) return tool('anthropic', 'write_file', { path: 'demo.js', content: 'unfinished Claude draft' });
        throw new TypeError('private-network-canary', { cause: Object.assign(new Error(), { code: 'ECONNRESET' }) });
      }
      const count = openai++;
      if (count === 0) return tool('openai', 'write_file', { path: 'demo.js', content: 'export const recoveredByGPT=true;\n' });
      if (count === 1) return finish('openai');
      return finish('openai', '接続障害後の完成原稿');
    }));
    assert.equal(claude, 4); assert.equal(openai, 3);
    assert.equal(report.completed.length, 2); assert.equal(report.blocked.length, 0);
    assert.equal(report.completed[0].fallback, true);
    assert(report.completed.every(task => task.ai === 'ChatGPT'));
    assert.match(fs.readFileSync(path.join(ctx.repo, 'demo.js'), 'utf8'), /recoveredByGPT/);
    assert.doesNotMatch(fs.readFileSync(path.join(ctx.repo, 'demo.js'), 'utf8'), /unfinished/);
    assert.doesNotMatch(JSON.stringify(report), /private-network-canary/);
  } finally { ctx.cleanup(); }
});
test('unusable key format stays pending without silently switching AI providers', async () => {
  const ctx = fixture(['[COPY] 告知']);
  try {
    ctx.env.ANTHROPIC_API_KEY = '貼付け文字';
    let calls = 0;
    const report = await runHybrid(ctx, options(async () => { calls++; throw new Error('must not call API'); }));
    assert.equal(calls, 0); assert.equal(report.completed.length, 0);
    assert.match(report.blocked[0].reason, /invalid_key/);
    assert.doesNotMatch(report.blocked[0].reason, /貼付け文字/);
    assert.match(fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8'), /- \[ \]/);
  } finally { ctx.cleanup(); }
});
test('failure of both providers keeps tasks pending and preserves safe transport diagnostics', async () => {
  const ctx = fixture(['[COPY] 告知']);
  try {
    const providers = [];
    const report = await runHybrid(ctx, options(async url => {
      providers.push(providerOf(url));
      throw new TypeError('private-credential-canary', { cause: Object.assign(new Error(), { code: 'ENOTFOUND' }) });
    }));
    assert.deepEqual(providers, ['anthropic', 'anthropic', 'anthropic', 'openai', 'openai', 'openai']);
    assert.equal(report.completed.length, 0); assert.equal(report.blocked.length, 1);
    assert.match(report.blocked[0].reason, /openai: network \/ dns/);
    assert.doesNotMatch(JSON.stringify(report), /private-credential-canary/);
    assert.equal(fs.existsSync(path.join(ctx.repo, 'docs/ai-outputs/copy-20261120.md')), false);
  } finally { ctx.cleanup(); }
});
test('o3-mini uses reasoning-compatible parameters and falls back to GPT-4o when unavailable', async () => {
  const ctx = fixture(['[GPT] [COPY] 告知']);
  try {
    ctx.env.AI_WORKER_OPENAI_MODEL = 'o3-mini';
    const models = [];
    const report = await runHybrid(ctx, options(async (_url, init) => {
      const body = JSON.parse(init.body); models.push(body.model);
      if (body.model === 'o3-mini') {
        assert.equal(body.messages[0].role, 'developer'); assert.equal('max_tokens' in body, false);
        return response(404, { error: { code: 'model_not_found', message: 'model not available' } });
      }
      return finish('openai', 'GPT-4oで作成した原稿');
    }));
    assert.deepEqual(models, ['o3-mini', 'gpt-4o']); assert.equal(report.completed[0].model, 'gpt-4o');
  } finally { ctx.cleanup(); }
});
test('draft tools reject outside paths, secrets, symlinks and COPY code edits', () => {
  const ctx = fixture(['[DEV] テスト']);
  try {
    const dev = new Draft(ctx.repo, 'DEV'), copy = new Draft(ctx.repo, 'COPY');
    assert.throws(() => dev.call('write_file', { path: '../outside.js', content: 'x' }));
    assert.throws(() => dev.call('write_file', { path: 'AI_INBOX.md', content: 'x' }));
    assert.throws(() => dev.call('replace_text', { path: 'AI_RULES.md', old_text: '# ブランド', new_text: '# 変更' }));
    assert.throws(() => copy.call('write_file', { path: 'demo.js', content: 'x' }));
    fs.symlinkSync(os.tmpdir(), path.join(ctx.repo, 'linked'));
    assert.throws(() => dev.call('write_file', { path: 'linked/test.js', content: 'x' }));
    fs.symlinkSync(path.join(ctx.root, 'not-created'), path.join(ctx.repo, 'broken-link'));
    assert.throws(() => dev.call('write_file', { path: 'broken-link', content: 'x' }));
    const secret = 'sk-' + 'x'.repeat(30);
    assert.throws(() => dev.call('write_file', { path: 'secret.js', content: secret }));
  } finally { ctx.cleanup(); }
});
test('DEV replacements must match exactly once and are not applied before commit', () => {
  const ctx = fixture(['[DEV] テスト']);
  try {
    fs.writeFileSync(path.join(ctx.repo, 'demo.js'), 'const score=1;\n');
    const draft = new Draft(ctx.repo, 'DEV');
    draft.call('replace_text', { path: 'demo.js', old_text: 'score=1', new_text: 'score=2' });
    assert.match(fs.readFileSync(path.join(ctx.repo, 'demo.js'), 'utf8'), /score=1/);
    draft.commit(); assert.match(fs.readFileSync(path.join(ctx.repo, 'demo.js'), 'utf8'), /score=2/);
    assert.throws(() => draft.call('replace_text', { path: 'demo.js', old_text: 'missing', new_text: 'x' }));
  } finally { ctx.cleanup(); }
});
test('an unfinished or turn-limited task never applies proposed code', async () => {
  const ctx = fixture(['[DEV] テスト']);
  try {
    const report = await runHybrid(ctx, { ...options(async () => tool('anthropic', 'write_file', { path: 'demo.js', content: 'draft' })), maxTurns: 1 });
    assert.equal(report.completed.length, 0); assert.equal(fs.existsSync(path.join(ctx.repo, 'demo.js')), false);
  } finally { ctx.cleanup(); }
});
test('separate validation checks the patch without API keys before marking tasks and adding AI logs', async () => {
  const ctx = fixture(['[GPT] [COPY] 告知']);
  try {
    await runHybrid(ctx, options(async () => finish('openai', '確認用の告知本文')));
    exportDraft(ctx);
    assert.doesNotMatch(fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8'), /- \[x\]/);
    const verifier = path.join(ctx.root, 'verifier');
    execFileSync('git', ['clone', ctx.repo, verifier], { stdio: 'pipe' });
    const env = { ...process.env, GITHUB_RUN_ID: '789', GITHUB_RUN_ATTEMPT: '1' };
    delete env.ANTHROPIC_API_KEY; delete env.OPENAI_API_KEY;
    validateDraft({ ...ctx, repo: verifier, env });
    const inbox = fs.readFileSync(path.join(verifier, 'AI_INBOX.md'), 'utf8');
    assert.match(inbox, /- \[x\] \[GPT\]/); assert.match(inbox, /## 完了済みログ/);
    assert.match(inbox, /ChatGPT/); assert.match(inbox, /2026-11-20 09:00:00/);
    const environment = JSON.parse(fs.readFileSync(path.join(verifier, 'dist/environment.json'), 'utf8'));
    assert.deepEqual(environment, { anthropic: false, openai: false });
    const proposal = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'proposal.json'), 'utf8'));
    assert.match(proposal.branch, /^ai-auto\/update-/);
  } finally { ctx.cleanup(); }
});
test('date-based output names follow Japan time at the UTC day boundary', () => {
  assert.equal(dateJapan(new Date('2026-11-19T15:01:00Z')).slice(0, 10), '2026-11-20');
});
