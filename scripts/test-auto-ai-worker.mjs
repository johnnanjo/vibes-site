import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
  parseInbox, markCompleted, chooseProvider, validateReport, assertNoSecrets,
  assertSafePaths, hasActiveWork, prepare, finalize, publish, runClaude, completionLog,
  inspectQueue, checkCredentials
} from './auto-ai-worker.mjs';

const handoff = '# HANDOFF\n\n## 作業中\n| だれが | 何を | 触るファイル | いつから |\n| --- | --- | --- | --- |\n| （なし） | | | |\n\n## 記録\n\n過去の記録\n';
const example = '# AI受付\n\n## 未処理\n- [ ] 表示を修正する\n  - 対象: static/demo.js\n  - 完了条件: 1点ずつ増える\n\n- [ ] 文面を修正する\n  - 完了条件: 指定どおり表示する\n\n## 例\n~~~markdown\n- [ ] この例は処理しない\n~~~\n';
const run = (repo, ...args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
function fixture(inbox = example) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'vibes-ai-worker-test-'));
  const repo = path.join(root, 'repo'), dir = path.join(root, 'run');
  fs.mkdirSync(repo);
  fs.writeFileSync(path.join(repo, 'AI_INBOX.md'), inbox);
  fs.writeFileSync(path.join(repo, 'CLAUDE.md'), '# 正本\n指定文面と数値を変更しない。\n');
  fs.writeFileSync(path.join(repo, 'AGENTS.md'), '# 共通ルール\nブランチとPRで出す。\n');
  fs.writeFileSync(path.join(repo, 'AI_RULES.md'), '# ブランド\nプレクイーン7点・10点とW3C25点を保持する。\n');
  fs.writeFileSync(path.join(repo, 'HANDOFF.md'), handoff);
  fs.writeFileSync(path.join(repo, '.gitignore'), 'dist/\n');
  fs.writeFileSync(path.join(repo, 'build.mjs'), 'console.log("fixture build passed");\n');
  run(repo, 'init', '-q'); run(repo, 'config', 'user.name', 'Test'); run(repo, 'config', 'user.email', 'test@example.invalid');
  run(repo, 'add', '.'); run(repo, 'commit', '-qm', 'fixture');
  const ctx = { repo, dir, openPRs: [], env: { ...process.env, GITHUB_OUTPUT: path.join(root, 'output'),
    GITHUB_STEP_SUMMARY: path.join(root, 'summary'), GITHUB_RUN_ID: '12345', GITHUB_RUN_ATTEMPT: '1' } };
  return { ...ctx, cleanup() { fs.rmSync(root, { recursive: true, force: true }); } };
}
function reportFor(ctx, completed = 1) {
  const request = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'request.json'), 'utf8'));
  return {
    completed: request.tasks.slice(0, completed).map(task => ({ id: task.id, summary: '対象の表示を修正しました', validation: 'node build.mjsを実行' })),
    blocked: request.tasks.slice(completed).map(task => ({ id: task.id, reason: '指定文面の確認が必要です' })),
    checks: ['node build.mjs'], unverified: ['実機ブラウザは未確認です']
  };
}
function saveReport(ctx, report) { fs.writeFileSync(path.join(ctx.dir, 'result.json'), JSON.stringify(report)); }

test('only top-level real tasks are parsed; fenced and nested checkboxes are excluded', () => {
  const text = example + '\n- [x] 既存の完了\n  - [ ] 内側の条件\n\n\x60\x60\x60\n- [ ] 二つめの例\n\x60\x60\x60\n';
  const tasks = parseInbox(text);
  assert.equal(tasks.length, 3); assert.equal(tasks.filter(task => !task.done).length, 2);
  assert.match(tasks[0].text, /static\/demo.js/);
});
test('completion updates only the chosen checkbox and preserves CRLF', () => {
  const inbox = example.replaceAll('\n', '\r\n'), tasks = parseInbox(inbox);
  const changed = markCompleted(inbox, [tasks[0].id]);
  assert.equal(changed, inbox.replace('- [ ] 表示', '- [x] 表示'));
  assert.throws(() => markCompleted(inbox, ['unknown']));
});
test('the mobile placeholder stays untouched while a real task is completed', () => {
  const placeholder = '- [ ] （ここにスマホからタスクを追記）';
  const ctx = fixture('# AI INBOX\n## タスク一覧\n' + placeholder + '\n');
  try {
    delete ctx.openPRs;
    prepare(ctx);
    assert.match(fs.readFileSync(ctx.env.GITHUB_OUTPUT, 'utf8'), /run=false/);
    assert.equal(run(ctx.repo, 'status', '--porcelain'), '');
    const inbox = fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8') + '- [ ] 大会名の表示を直す\n';
    const tasks = parseInbox(inbox);
    assert.equal(tasks.length, 1);
    const result = markCompleted(inbox, [tasks[0].id]);
    assert(result.includes(placeholder));
    assert(result.includes('- [x] 大会名の表示を直す'));
  } finally { ctx.cleanup(); }
});
test('queue inspection lists unfinished tasks without PR access or repository changes', () => {
  const ctx = fixture('# AI INBOX\n## タスク一覧\n- [ ] （ここにスマホからタスクを追記）\n- [ ] 表示を直す\n- [x] 完了した作業\n');
  try {
    delete ctx.openPRs;
    const tasks = inspectQueue(ctx);
    assert.equal(tasks.length, 1);
    assert.match(fs.readFileSync(ctx.env.GITHUB_OUTPUT, 'utf8'), /pending=1/);
    const log = fs.readFileSync(ctx.env.GITHUB_STEP_SUMMARY, 'utf8');
    assert(log.includes('表示を直す')); assert(!log.includes('完了した作業'));
    assert.equal(run(ctx.repo, 'status', '--porcelain'), '');
    assert.equal(fs.existsSync(ctx.dir), false);
  } finally { ctx.cleanup(); }
});
test('missing API keys exit successfully and configured-key checks never print their values', () => {
  const ctx = fixture();
  try {
    delete ctx.env.ANTHROPIC_API_KEY; delete ctx.env.OPENAI_API_KEY;
    const worker = fileURLToPath(new URL('./auto-ai-worker.mjs', import.meta.url));
    const log = execFileSync(process.execPath, [worker, 'credentials'], { cwd: ctx.repo, env: ctx.env, encoding: 'utf8' });
    assert.match(log, /未設定.*正常終了/);
    assert.match(fs.readFileSync(ctx.env.GITHUB_OUTPUT, 'utf8'), /configured=false/);
    for (const name of ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY']) {
      ctx.env[name] = 'unit-private-value';
      assert.equal(checkCredentials(ctx), true);
      delete ctx.env[name];
    }
    assert(!fs.readFileSync(ctx.env.GITHUB_STEP_SUMMARY, 'utf8').includes('unit-private-value'));
    assert.equal(run(ctx.repo, 'status', '--porcelain'), '');
  } finally { ctx.cleanup(); }
});
test('provider selection prefers Claude, falls back to configured OpenAI, and requires a key', () => {
  assert.equal(chooseProvider('auto', true, true), 'anthropic');
  assert.equal(chooseProvider('auto', false, true), 'openai');
  assert.equal(chooseProvider('openai', true, true), 'openai');
  assert.throws(() => chooseProvider('auto', false, false));
  assert.throws(() => chooseProvider('anthropic', false, true));
  assert.throws(() => chooseProvider('other', true, true));
});
test('every pending task must be reported exactly once, with evidence or a reason', () => {
  const tasks = parseInbox(example).filter(task => !task.done);
  const good = { completed: [{ id: tasks[0].id, summary: '実装', validation: 'ビルド' }],
    blocked: [{ id: tasks[1].id, reason: '要確認' }], checks: [], unverified: [] };
  assert.equal(validateReport(good, tasks), good);
  assert.throws(() => validateReport({ ...good, blocked: [] }, tasks));
  assert.throws(() => validateReport({ ...good, blocked: [{ id: tasks[0].id, reason: '重複' }] }, tasks));
  assert.throws(() => validateReport({ ...good, completed: [{ id: tasks[0].id, summary: '', validation: '' }] }, tasks));
});
test('credential-like values and sensitive or built paths are rejected without printing values', () => {
  const value = 'sk-' + 'x'.repeat(30);
  assert.throws(() => assertNoSecrets(value), error => !error.message.includes(value));
  for (const file of ['.env', 'a/.env.production', 'dist/index.html', '../outside', 'a/key.pem', '.git/config']) {
    assert.throws(() => assertSafePaths([file]));
  }
  assert.doesNotThrow(() => assertSafePaths(['static/demo.js', 'AI_INBOX.md', 'HANDOFF.md']));
});
test('active handoff rows are detected while an empty table is accepted', () => {
  assert.equal(hasActiveWork(handoff), false);
  assert.equal(hasActiveWork(handoff.replace('（なし）', 'Claude')), true);
});
test('empty queue exits without API keys, PR queries, or modifications', () => {
  const ctx = fixture('# AI受付\n\n~~~\n- [ ] 例のみ\n~~~\n');
  try {
    delete ctx.openPRs;
    prepare(ctx);
    assert.match(fs.readFileSync(ctx.env.GITHUB_OUTPUT, 'utf8'), /run=false/);
    assert.equal(run(ctx.repo, 'status', '--porcelain'), '');
    assert.equal(fs.existsSync(path.join(ctx.dir, 'prompt.txt')), false);
  } finally { ctx.cleanup(); }
});
test('a credential-like value in the inbox is rejected before writing request artifacts', () => {
  const ctx = fixture(example + '\n' + 'sk-' + 'x'.repeat(30) + '\n');
  try {
    assert.throws(() => prepare(ctx), /鍵らしい値/);
    assert.equal(fs.existsSync(path.join(ctx.dir, 'request.json')), false);
    assert.equal(run(ctx.repo, 'status', '--porcelain'), '');
  } finally { ctx.cleanup(); }
});
test('existing automatic PR defers new work without another agent call', () => {
  const ctx = fixture(); ctx.openPRs = [{ number: 42 }];
  try {
    prepare(ctx);
    assert.match(fs.readFileSync(ctx.env.GITHUB_OUTPUT, 'utf8'), /run=false/);
    assert.equal(run(ctx.repo, 'status', '--porcelain'), '');
  } finally { ctx.cleanup(); }
});
test('another active worker defers automatic work', () => {
  const ctx = fixture();
  try {
    fs.writeFileSync(path.join(ctx.repo, 'HANDOFF.md'), handoff.replace('（なし）', 'Claude'));
    prepare(ctx);
    assert.match(fs.readFileSync(ctx.env.GITHUB_OUTPUT, 'utf8'), /run=false/);
    assert.equal(fs.existsSync(path.join(ctx.dir, 'prompt.txt')), false);
  } finally { ctx.cleanup(); }
});
test('rules are handed over in canonical order and task content is data, never shell code', () => {
  const ctx = fixture(example.replace('表示を修正する', '文字列 $(touch SHOULD_NOT_EXIST) を表示する'));
  try {
    prepare(ctx);
    const prompt = fs.readFileSync(path.join(ctx.dir, 'prompt.txt'), 'utf8');
    assert(prompt.indexOf('----- CLAUDE.md') < prompt.indexOf('----- HANDOFF.md'));
    assert(prompt.indexOf('----- HANDOFF.md') < prompt.indexOf('----- AGENTS.md'));
    assert(prompt.indexOf('----- AGENTS.md') < prompt.indexOf('----- AI_RULES.md'));
    assert(prompt.includes('プレクイーン7点・10点とW3C25点を保持する。'));
    assert(prompt.includes('$(touch SHOULD_NOT_EXIST)'));
    assert.equal(fs.existsSync(path.join(ctx.repo, 'SHOULD_NOT_EXIST')), false);
    assert.match(fs.readFileSync(path.join(ctx.repo, 'HANDOFF.md'), 'utf8'), /GitHub Actions \/ AI worker/);
    assert.equal(fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8').includes('- [x]'), false);
  } finally { ctx.cleanup(); }
});
test('successful partial implementation marks only completed work and prepares a draft PR patch', () => {
  const ctx = fixture();
  try {
    prepare(ctx); fs.writeFileSync(path.join(ctx.repo, 'demo.mjs'), 'export const value = 1;\n');
    saveReport(ctx, reportFor(ctx, 1)); finalize(ctx);
    const tasks = parseInbox(fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8'));
    assert.equal(tasks[0].done, true); assert.equal(tasks[1].done, false);
    const proposal = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'proposal.json'), 'utf8'));
    assert.equal(proposal.draft, true); assert.match(proposal.branch, /^ai-auto\/update-/);
    assert.match(fs.readFileSync(path.join(ctx.dir, 'proposal.patch'), 'utf8'), /demo\.mjs/);
    const saved = fs.readFileSync(path.join(ctx.repo, 'HANDOFF.md'), 'utf8');
    assert.equal(hasActiveWork(saved), false); assert.match(saved, /実装と共通チェック成功: 1件/);
    assert.match(fs.readFileSync(path.join(ctx.dir, 'pr-body.md'), 'utf8'), /実機で未確認/);
  } finally { ctx.cleanup(); }
});
test('a successful full batch produces a non-draft proposal', () => {
  const ctx = fixture();
  try {
    prepare(ctx); fs.writeFileSync(path.join(ctx.repo, 'demo.mjs'), 'export const value = 1;\n');
    saveReport(ctx, reportFor(ctx, 2)); finalize(ctx);
    assert.equal(JSON.parse(fs.readFileSync(path.join(ctx.dir, 'proposal.json'), 'utf8')).draft, false);
  } finally { ctx.cleanup(); }
});
test('build failure leaves all task checkboxes pending and emits no proposal', () => {
  const ctx = fixture();
  try {
    prepare(ctx); fs.writeFileSync(path.join(ctx.repo, 'build.mjs'), 'process.exit(1);\n');
    saveReport(ctx, reportFor(ctx));
    assert.throws(() => finalize(ctx), /独立した検証に失敗/);
    assert.equal(fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8'), example);
    assert.equal(fs.existsSync(path.join(ctx.dir, 'proposal.patch')), false);
  } finally { ctx.cleanup(); }
});
test('AI edits to the inbox and false completion without an implementation are rejected', () => {
  const ctx = fixture();
  try {
    prepare(ctx); saveReport(ctx, reportFor(ctx));
    fs.appendFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'unauthorized');
    assert.throws(() => finalize(ctx), /受付内容が変更/);
    fs.writeFileSync(path.join(ctx.repo, 'AI_INBOX.md'), example);
    assert.throws(() => finalize(ctx), /実装ファイルの差分がありません/);
  } finally { ctx.cleanup(); }
});
test('a new secret file prevents checkbox updates and patch export', () => {
  const ctx = fixture();
  try {
    prepare(ctx); saveReport(ctx, reportFor(ctx));
    fs.writeFileSync(path.join(ctx.repo, '.env'), 'EXAMPLE=not-a-real-key\n');
    assert.throws(() => finalize(ctx), /含められないファイル/);
    assert.equal(fs.readFileSync(path.join(ctx.repo, 'AI_INBOX.md'), 'utf8'), example);
  } finally { ctx.cleanup(); }
});
test('publisher rejects a modified artifact before branch creation or any network write', () => {
  const ctx = fixture();
  try {
    prepare(ctx); fs.writeFileSync(path.join(ctx.repo, 'demo.mjs'), 'export const value = 1;\n');
    saveReport(ctx, reportFor(ctx, 2)); finalize(ctx);
    fs.appendFileSync(path.join(ctx.dir, 'proposal.patch'), 'changed');
    assert.throws(() => publish(ctx), /出自または整合性/);
    assert.equal(run(ctx.repo, 'branch', '--list', 'ai-auto/*').trim(), '');
  } finally { ctx.cleanup(); }
});
test('an initially empty completion section receives table headers and actual AI metadata', () => {
  const inbox = '# VIBES AI INBOX\n## 待機中タスク\n- [ ] [COPY] 告知3案\n\n## 完了済みログ\n';
  const tasks = parseInbox(inbox);
  assert.equal(tasks.length, 1); assert.equal(tasks[0].done, false);
  const completed = [{ id: tasks[0].id, ai: 'ChatGPT', model: 'gpt-4o', finishedAt: '2026-11-20 09:00:00' }];
  const logged = completionLog(markCompleted(inbox, [tasks[0].id]), completed, tasks);
  assert.match(logged, /\| 完了日時 日本時間 \| タスク \| 使用AI \| モデル \|/);
  assert.match(logged, /\| 2026-11-20 09:00:00 \| \[COPY\] 告知3案 \| ChatGPT \| gpt-4o \|/);
  assert.equal(parseInbox(logged)[0].done, true);
});
test('Claude CLI receives stdin and bounded flags but no GitHub or OpenAI credentials', () => {
  const ctx = fixture();
  try {
    prepare(ctx);
    const bin = path.join(ctx.dir, 'bin'); fs.mkdirSync(bin);
    const trace = path.join(ctx.dir, 'cli-trace.json');
    const code = '#!/usr/bin/env node\nconst fs=require("node:fs");' +
      'const input=fs.readFileSync(0,"utf8");' +
      'fs.writeFileSync(process.env.CLI_TRACE,JSON.stringify({args:process.argv.slice(2),input,' +
      'github:!!process.env.GH_TOKEN,github2:!!process.env.GITHUB_TOKEN,openai:!!process.env.OPENAI_API_KEY}));' +
      'console.log(JSON.stringify({is_error:false,structured_output:JSON.parse(process.env.CLI_TEST_RESULT)}));';
    fs.writeFileSync(path.join(bin, 'claude'), code, { mode: 0o700 });
    ctx.env = { ...ctx.env, PATH: bin + path.delimiter + process.env.PATH, CLI_TRACE: trace,
      CLI_TEST_RESULT: JSON.stringify(reportFor(ctx, 2)), GH_TOKEN: 'test-only', GITHUB_TOKEN: 'test-only',
      OPENAI_API_KEY: 'test-only', AI_WORKER_CLAUDE_BUDGET_USD: '5' };
    runClaude(ctx);
    const result = JSON.parse(fs.readFileSync(trace, 'utf8'));
    assert.equal(result.github, false); assert.equal(result.github2, false); assert.equal(result.openai, false);
    assert(result.args.includes('--bare')); assert(result.args.includes('--max-turns'));
    assert(result.args.includes('--max-budget-usd')); assert(result.input.includes('CLAUDE.md'));
    assert.equal(JSON.parse(fs.readFileSync(path.join(ctx.dir, 'result.json'), 'utf8')).completed.length, 2);
  } finally { ctx.cleanup(); }
});
test('separate publisher applies the artifact and pushes only its new branch to a local bare remote', () => {
  const ctx = fixture();
  try {
    const base = run(ctx.repo, 'rev-parse', 'HEAD').trim();
    const baseBranch = run(ctx.repo, 'symbolic-ref', '--short', 'HEAD').trim();
    const parent = path.dirname(ctx.repo), remote = path.join(parent, 'origin.git'), publisher = path.join(parent, 'publisher');
    execFileSync('git', ['clone', '--bare', ctx.repo, remote], { stdio: 'pipe' });
    execFileSync('git', ['clone', remote, publisher], { stdio: 'pipe' });
    prepare(ctx); fs.writeFileSync(path.join(ctx.repo, 'demo.mjs'), 'export const value = 1;\n');
    saveReport(ctx, reportFor(ctx, 2)); finalize(ctx);
    const bin = path.join(parent, 'bin'); fs.mkdirSync(bin);
    const trace = path.join(parent, 'pr-command.json');
    fs.writeFileSync(path.join(bin, 'gh'), '#!/usr/bin/env node\n' +
      'require("node:fs").writeFileSync(process.env.PR_TRACE, JSON.stringify(process.argv.slice(2)));' +
      'console.log("https://example.invalid/pr/1");', { mode: 0o700 });
    const publisherCtx = { ...ctx, repo: publisher, env: { ...ctx.env,
      PATH: bin + path.delimiter + process.env.PATH, PR_TRACE: trace, GITHUB_REPOSITORY: 'example/test' } };
    publish(publisherCtx);
    const proposal = JSON.parse(fs.readFileSync(path.join(ctx.dir, 'proposal.json'), 'utf8'));
    assert.notEqual(run(remote, 'rev-parse', 'refs/heads/' + proposal.branch).trim(), base);
    assert.equal(run(remote, 'rev-parse', 'refs/heads/' + baseBranch).trim(), base);
    assert.equal(fs.readFileSync(path.join(publisher, 'demo.mjs'), 'utf8'), 'export const value = 1;\n');
    const args = JSON.parse(fs.readFileSync(trace, 'utf8'));
    assert(args.includes('--body-file')); assert(args.includes('--base')); assert(args.includes('main'));
    assert.equal(args.includes('--draft'), false);
  } finally { ctx.cleanup(); }
});
