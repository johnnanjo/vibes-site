// Trusted orchestration stays outside the agent's working tree during execution.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WORKER = 'GitHub Actions / AI worker';
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
const tokyoStamp = () => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo',
  year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  second: '2-digit', hourCycle: 'h23' }).format(new Date()).replace(/\D/g, '');
const read = file => fs.readFileSync(file, 'utf8');
const write = (file, value) => fs.writeFileSync(file, value, { mode: 0o600 });
const fail = message => { throw new Error(message); };
function json(text, label) { try { return JSON.parse(text); } catch { fail(label + 'のJSON形式が不正です。値は表示しません。'); } }
const git = (repo, args) => execFileSync('git', args, { cwd: repo, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
const settings = () => ({
  repo: process.cwd(), env: process.env,
  dir: path.resolve(process.env.AI_WORKER_DIR || path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'auto-ai-worker'))
});
function output(ctx, key, value) {
  if (ctx.env.GITHUB_OUTPUT) fs.appendFileSync(ctx.env.GITHUB_OUTPUT, key + '=' + value + '\n');
}
function summary(ctx, message) {
  console.log(message);
  if (ctx.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(ctx.env.GITHUB_STEP_SUMMARY, message + '\n\n');
}

export function parseInbox(text) {
  const lines = text.split(/\r?\n/), tasks = [];
  let fence = '', start = -1;
  function finish(end) {
    if (start < 0) return;
    const task = tasks[tasks.length - 1];
    task.text = lines.slice(start, end).join('\n').trimEnd();
    task.id = digest(task.text.replace(/^-\s+\[[ xX]\]/, '- [ ]')).slice(0, 16);
    start = -1;
  }
  lines.forEach((line, index) => {
    const mark = /^\s*((?:\x60){3,}|~{3,})/.exec(line);
    if (mark) {
      if (!fence) fence = mark[1];
      else if (mark[1][0] === fence[0] && mark[1].length >= fence.length) fence = '';
      return;
    }
    if (fence) return;
    const match = /^-\s+\[([ xX])\]\s+(.+)$/.exec(line);
    if (match) {
      finish(index);
      tasks.push({ line: index, title: match[2], done: match[1] !== ' ', text: '', id: '' });
      start = index;
    } else if (/^#{1,6}\s/.test(line)) finish(index);
  });
  finish(lines.length);
  return tasks;
}

export function markCompleted(inbox, completedIds) {
  const ids = new Set(completedIds), tasks = parseInbox(inbox);
  const pending = tasks.filter(task => !task.done);
  for (const id of ids) if (!pending.some(task => task.id === id)) fail('不明なタスクを完了にはできません。');
  const lines = inbox.split(/\r?\n/), newline = inbox.includes('\r\n') ? '\r\n' : '\n';
  for (const task of pending) {
    if (ids.has(task.id)) lines[task.line] = lines[task.line].replace(/\[ \]/, '[x]');
  }
  return lines.join(newline);
}

export function chooseProvider(requested, anthropic, openai) {
  if (!['auto', 'anthropic', 'openai'].includes(requested)) fail('AI_WORKER_PROVIDER は auto / anthropic / openai です。');
  const provider = requested === 'auto' ? (anthropic ? 'anthropic' : openai ? 'openai' : '') : requested;
  if (provider === 'anthropic' && anthropic) return provider;
  if (provider === 'openai' && openai) return provider;
  fail('使用するAIのAPIキーをRepository secretsへ登録してください。ANTHROPIC_API_KEY または OPENAI_API_KEY。');
}

export const resultSchema = {
  type: 'object', additionalProperties: false,
  properties: {
    completed: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { id: { type: 'string' }, summary: { type: 'string' }, validation: { type: 'string' } },
      required: ['id', 'summary', 'validation'] } },
    blocked: { type: 'array', items: { type: 'object', additionalProperties: false,
      properties: { id: { type: 'string' }, reason: { type: 'string' } }, required: ['id', 'reason'] } },
    checks: { type: 'array', items: { type: 'string' } },
    unverified: { type: 'array', items: { type: 'string' } }
  },
  required: ['completed', 'blocked', 'checks', 'unverified']
};

export function validateReport(report, tasks) {
  if (!report || resultSchema.required.some(key => !Array.isArray(report[key]))) fail('AIの完了報告が指定のJSON形式ではありません。');
  if (Object.keys(report).some(key => !resultSchema.required.includes(key))) fail('AIの完了報告に不明な項目があります。');
  const expected = new Set(tasks.map(task => task.id)), seen = new Set();
  for (const [key, fields] of [['completed', ['id', 'summary', 'validation']], ['blocked', ['id', 'reason']]]) {
    for (const item of report[key]) {
      const metadata = key === 'completed' ? ['ai', 'model', 'kind', 'output', 'finishedAt', 'fallback'] : [];
      if (!item || fields.some(field => typeof item[field] !== 'string' || !item[field].trim()) ||
        Object.keys(item).some(field => !fields.includes(field) && !metadata.includes(field))) fail('タスクの実装結果や未完了の理由が不足しています。');
      if (item.ai != null && !['Claude', 'ChatGPT'].includes(item.ai)) fail('実行AIの記録が不正です。');
      if (item.kind != null && !['COPY', 'DEV'].includes(item.kind)) fail('タスク種別の記録が不正です。');
      if (['model', 'output', 'finishedAt'].some(field => item[field] != null && typeof item[field] !== 'string')) fail('実行メタデータが不正です。');
      if (item.fallback != null && typeof item.fallback !== 'boolean') fail('切替の記録が不正です。');
      if (!expected.has(item.id) || seen.has(item.id)) fail('不明または重複したタスクの完了報告です。');
      seen.add(item.id);
    }
  }
  if (seen.size !== expected.size) fail('未処理タスクすべての実装結果または未完了の理由が必要です。');
  if (['checks', 'unverified'].some(key => report[key].some(value => typeof value !== 'string' || !value.trim()))) fail('検証報告は空でない文字列にしてください。');
  return report;
}

export function assertNoSecrets(text) {
  const patterns = [
    /sk-ant-[A-Za-z0-9_-]{20,}/, /sk-(?:proj-)?[A-Za-z0-9_-]{24,}/,
    /github_pat_[A-Za-z0-9_]{30,}/, /gh[opusr]_[A-Za-z0-9]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/
  ];
  if (patterns.some(pattern => pattern.test(text))) fail('鍵らしい値を検出しました。値は表示せず、PR作成を停止します。');
}
export function assertSafePaths(files) {
  for (const file of files) {
    if (file.startsWith('/') || file.split('/').includes('..') ||
      /(^|\/)(?:\.git|dist|node_modules)(\/|$)/.test(file) ||
      /(^|\/)(?:\.env(?:\..*)?|auth\.json|credentials(?:\..*)?|id_rsa|id_ed25519)$/.test(file) ||
      /\.(?:pem|p12|pfx)$/i.test(file)) fail('自動PRに含められないファイルがあります: ' + file);
  }
}
function openPRs(ctx) {
  if (ctx.openPRs) return ctx.openPRs;
  if (!ctx.env.GITHUB_REPOSITORY) fail('GitHubのリポジトリ情報がありません。');
  const raw = execFileSync('gh', ['pr', 'list', '--repo', ctx.env.GITHUB_REPOSITORY,
    '--base', 'main', '--state', 'open', '--limit', '100',
    '--json', 'number,url,headRefName'], { cwd: ctx.repo, encoding: 'utf8', env: ctx.env });
  return json(raw, 'PR一覧').filter(pr => /^ai-auto\/(?:task|update)-/.test(pr.headRefName));
}
function workSection(handoff) {
  // Match to the next level-two heading, preserving all table rows.
  const start = handoff.indexOf('## 作業中');
  if (start < 0) fail('HANDOFF.md に「作業中」の欄がありません。');
  const end = handoff.indexOf('\n## ', start + 1);
  return handoff.slice(start, end < 0 ? handoff.length : end);
}
export function hasActiveWork(handoff) {
  return workSection(handoff).split(/\r?\n/).some(line => {
    if (!line.startsWith('|')) return false;
    const who = line.split('|')[1].trim();
    return who && who !== 'だれが' && !/^-+$/.test(who.replace(/\s/g, '')) && !/^[（(]なし[）)]$/.test(who);
  });
}
function withWorkNote(handoff) {
  const row = '| ' + WORKER + ' | AI_INBOXの未処理タスク | AI_INBOXで指定された範囲 | 自動実行中 |';
  const section = workSection(handoff), empty = /^\| [（(]なし[）)] \|.*$/m;
  if (empty.test(section)) return handoff.replace(empty, row);
  fail('HANDOFF.md の作業中の札を安全に追加できません。');
}
function withoutWorkNote(handoff) {
  const lines = handoff.split('\n').filter(line => !line.startsWith('| ' + WORKER + ' |'));
  let result = lines.join('\n');
  if (!hasActiveWork(result)) {
    const section = workSection(result);
    if (!section.includes('（なし）') && !section.includes('(なし)')) {
      const updated = section.replace(/^(\| ?---[^\n]*\n)/m, '$1| （なし） | | | |\n');
      result = result.replace(section, updated);
    }
  }
  return result;
}

export function prepare(ctx = settings()) {
  const inbox = read(path.join(ctx.repo, 'AI_INBOX.md'));
  const tasks = parseInbox(inbox).filter(task => !task.done);
  const baseSha = git(ctx.repo, ['rev-parse', 'HEAD']).trim();
  output(ctx, 'base_sha', baseSha);
  if (!tasks.length) { output(ctx, 'run', 'false'); return summary(ctx, '未処理タスクは0件です。AIは呼び出していません。'); }
  const ids = tasks.map(task => task.id);
  if (new Set(ids).size !== ids.length) fail('同じ内容の未処理タスクが重複しています。まとめてから実行してください。');
  const rules = ['CLAUDE.md', 'HANDOFF.md', 'AGENTS.md'].map(name => ({ name, text: read(path.join(ctx.repo, name)) }));
  assertNoSecrets(inbox);
  for (const rule of rules) assertNoSecrets(rule.text);
  const prs = openPRs(ctx);
  if (prs.length) { output(ctx, 'run', 'false'); return summary(ctx, '既存の自動PR #' + prs[0].number + ' を確認待ちです。マージ後に残りを処理します。'); }
  if (hasActiveWork(rules[1].text)) { output(ctx, 'run', 'false'); return summary(ctx, 'HANDOFF.mdに作業中の札があります。作業終了後に手動実行またはAI_INBOX更新で再開してください。'); }
  fs.mkdirSync(ctx.dir, { recursive: true, mode: 0o700 });
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(ctx.dir, 'worker.mjs'));
  write(path.join(ctx.dir, 'request.json'), JSON.stringify({ inbox, tasks, baseSha }));
  write(path.join(ctx.dir, 'schema.json'), JSON.stringify(resultSchema));
  const prompt = [
    'あなたはjohnnanjo/vibes-siteの自動実装担当です。返事と変更記録は日本語にしてください。',
    '最初に以下のCLAUDE.md、HANDOFF.md、AGENTS.mdをこの順ですべて読み、その決まりに従ってください。',
    ...rules.map(rule => '\n----- ' + rule.name + ' -----\n' + rule.text),
    '\n----- この実行の指示 -----',
    '開始時の未処理タスクをすべて検討し、必要なコードとファイルを実装してください。',
    '作業中の札はワーカーが追加済みです。終了時の札の除去と実行記録はワーカーが行います。',
    'AI_INBOX.mdそのものは変更しないでください。完了したidだけをJSONで報告し、チェック更新は検証後にワーカーが行います。',
    'コミット、ブランチ操作、push、PR作成、mainへの反映、外部サービスの設定変更やメッセージ送信は行いません。',
    '実装の範囲はこのリポジトリだけです。鍵を読んだり表示したり保存したりせず、個人情報やdistを追加しません。',
    '指定された文面・数値・大会結果は勝手に変更しません。曖昧な点や権限不足は推測せずblockedへ理由を書いてください。',
    '必要なテストと node build.mjs、node scripts/lab-positions.mjs --check を実行し、失敗したら実装を直してください。',
    'scripts/test-auto-ai-worker.mjs と scripts/test-queen-cup.mjs がある場合はそれらも実行してください。',
    '実装・検証が終わったタスクだけをcompletedに入れ、それ以外はblockedに入れます。すべてのidをどちらか一方に報告してください。',
    '実機・本番で未確認のものはunverifiedに明記します。最後は指定のJSON Schemaの形で出力してください。',
    '\n----- 受付タスク -----\n' + JSON.stringify(tasks, null, 2)
  ].join('\n');
  write(path.join(ctx.dir, 'prompt.txt'), prompt);
  write(path.join(ctx.repo, 'HANDOFF.md'), withWorkNote(rules[1].text));
  output(ctx, 'run', 'true');
  summary(ctx, String(tasks.length) + '件の未処理タスクを受け付けました。');
}

export function runClaude(ctx = settings()) {
  const budget = Number(ctx.env.AI_WORKER_CLAUDE_BUDGET_USD || 10);
  if (!Number.isFinite(budget) || budget <= 0) fail('Claudeの予算は正の数で設定してください。');
  const env = { ...ctx.env };
  delete env.GH_TOKEN; delete env.GITHUB_TOKEN; delete env.OPENAI_API_KEY;
  const args = ['--bare', '-p', '--output-format', 'json',
    '--json-schema', read(path.join(ctx.dir, 'schema.json')),
    '--allowedTools', 'Read,Edit,Write,Glob,Grep,Bash(node *),Bash(git diff *),Bash(git status *)',
    '--max-turns', '80', '--max-budget-usd', String(budget)];
  if (ctx.env.AI_WORKER_CLAUDE_MODEL) args.push('--model', ctx.env.AI_WORKER_CLAUDE_MODEL);
  const result = spawnSync('claude', args, { cwd: ctx.repo, env,
    input: read(path.join(ctx.dir, 'prompt.txt')), encoding: 'utf8',
    timeout: 24 * 60 * 1000, maxBuffer: 32 * 1024 * 1024 });
  write(path.join(ctx.dir, 'claude-response.json'), result.stdout || '');
  if (result.status !== 0 || result.error) fail('Claude Codeの実装が完了しませんでした。キー、利用枠、予算、実行上限を確認してください。タスクは完了扱いにしません。');
  const raw = json(result.stdout, 'Claudeの完了報告');
  if (raw.is_error || !raw.structured_output) fail('Claude Codeから有効な完了報告を受け取れませんでした。');
  write(path.join(ctx.dir, 'result.json'), JSON.stringify(raw.structured_output));
}

function independentChecks(ctx) {
  const commands = [['node', 'build.mjs']];
  for (const file of ['scripts/lab-positions.mjs', 'scripts/test-auto-ai-worker.mjs', 'scripts/test-ai-worker.mjs', 'scripts/test-queen-cup.mjs']) {
    if (fs.existsSync(path.join(ctx.repo, file))) commands.push(['node', file, ...(file.endsWith('lab-positions.mjs') ? ['--check'] : [])]);
  }
  commands.push(['git', 'diff', '--check']);
  for (const [command, ...args] of commands) {
    const result = spawnSync(command, args, { cwd: ctx.repo, env: ctx.env, stdio: 'inherit' });
    if (result.status !== 0) fail('独立した検証に失敗しました: ' + [command, ...args].join(' ') + '。チェック更新とPR作成は行いません。');
  }
  return commands.map(command => command.join(' '));
}
function stagedFiles(repo) { return git(repo, ['diff', '--cached', '--name-only', '-z']).split('\0').filter(Boolean); }

export function completionLog(inbox, completed, tasks) {
  if (!completed.length) return inbox;
  const titles = new Map(tasks.map(task => [task.id, task.title]));
  const cell = text => String(text).replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
  let result = inbox;
  if (!/^## 完了済みログ\s*$/m.test(result)) {
    result = result.trimEnd() + '\n\n## 完了済みログ\n';
  }
  const log = result.slice(result.search(/^## 完了済みログ\s*$/m));
  if (!/^\| 完了日時 日本時間 \|/m.test(log)) {
    result = result.trimEnd() + '\n\n| 完了日時 日本時間 | タスク | 使用AI | モデル |\n| --- | --- | --- | --- |\n';
  }
  for (const task of completed) {
    const stamp = tokyoStamp(), when = task.finishedAt || stamp.slice(0, 4) + '-' + stamp.slice(4, 6) + '-' + stamp.slice(6, 8) + ' ' +
      stamp.slice(8, 10) + ':' + stamp.slice(10, 12) + ':' + stamp.slice(12, 14);
    result = result.trimEnd() + '\n| ' + [when, titles.get(task.id), task.ai || '未記録', task.model || '未記録'].map(cell).join(' | ') + ' |\n';
  }
  return result;
}

export function exportDraft(ctx = settings()) {
  const request = json(read(path.join(ctx.dir, 'request.json')), '受付情報');
  if (git(ctx.repo, ['rev-parse', 'HEAD']).trim() !== request.baseSha ||
    read(path.join(ctx.repo, 'AI_INBOX.md')) !== request.inbox) fail('受付内容または元のコミットが変わりました。');
  const report = validateReport(json(read(path.join(ctx.dir, 'result.json')), '完了報告'), request.tasks);
  assertNoSecrets(JSON.stringify(report));
  git(ctx.repo, ['add', '-A']); assertSafePaths(stagedFiles(ctx.repo));
  const patch = git(ctx.repo, ['diff', '--cached', '--binary', '--full-index']);
  assertNoSecrets(patch);
  write(path.join(ctx.dir, 'draft.patch'), patch);
  write(path.join(ctx.dir, 'draft.json'), JSON.stringify({ baseSha: request.baseSha, patchSha256: digest(patch) }));
  output(ctx, 'ready', 'true');
  summary(ctx, 'APIによる変更提案を保存しました。コード実行とチェック更新は別ジョブで行います。');
}

export function validateDraft(ctx = settings()) {
  const manifest = json(read(path.join(ctx.dir, 'draft.json')), '変更提案');
  const patch = read(path.join(ctx.dir, 'draft.patch'));
  if (git(ctx.repo, ['rev-parse', 'HEAD']).trim() !== manifest.baseSha || digest(patch) !== manifest.patchSha256) fail('変更提案の整合性を確認できません。');
  assertNoSecrets(patch);
  fs.copyFileSync(fileURLToPath(import.meta.url), path.join(ctx.dir, 'worker.mjs'));
  git(ctx.repo, ['apply', '--index', '--', path.join(ctx.dir, 'draft.patch')]);
  assertSafePaths(stagedFiles(ctx.repo));
  return finalize(ctx);
}

export function finalize(ctx = settings()) {
  const request = json(read(path.join(ctx.dir, 'request.json')), '受付情報');
  if (git(ctx.repo, ['rev-parse', 'HEAD']).trim() !== request.baseSha) fail('AIがコミットを変更しました。PR作成を停止します。');
  const inboxPath = path.join(ctx.repo, 'AI_INBOX.md');
  if (read(inboxPath) !== request.inbox) fail('AI_INBOX.mdの受付内容が変更されています。チェック更新を停止します。');
  const report = validateReport(json(read(path.join(ctx.dir, 'result.json')), '完了報告'), request.tasks);
  assertNoSecrets(JSON.stringify(report));
  const checks = independentChecks(ctx);
  git(ctx.repo, ['add', '-A']);
  let files = stagedFiles(ctx.repo);
  assertSafePaths(files);
  for (const file of files) {
    const target = path.join(ctx.repo, file);
    if (fs.existsSync(target) && fs.lstatSync(target).isSymbolicLink()) fail('自動PRではシンボリックリンクを追加できません。');
  }
  const implementation = files.filter(file => file !== 'HANDOFF.md' && file !== 'AI_INBOX.md');
  if (report.completed.length && !implementation.length) fail('実装ファイルの差分がありません。タスクを完了扱いにしません。');
  const before = git(ctx.repo, ['diff', '--cached', '--binary', '--full-index']);
  assertNoSecrets(before.split('\n').filter(line => line.startsWith('+') && !line.startsWith('+++')).join('\n'));
  write(inboxPath, completionLog(markCompleted(request.inbox, report.completed.map(item => item.id)), report.completed, request.tasks));
  const handoffPath = path.join(ctx.repo, 'HANDOFF.md');
  let handoff = withoutWorkNote(read(handoffPath));
  const date = tokyoStamp(), when = date.slice(0, 4) + '-' + date.slice(4, 6) + '-' + date.slice(6, 8);
  const record = '### ' + when + ' — AI_INBOX 自動実装\n' +
    '- 実装と共通チェック成功: ' + report.completed.length + '件。未完了: ' + report.blocked.length + '件。\n' +
    '- 実施した共通チェック: ' + checks.join(' / ') + '。\n' +
    '- 実機・本番で未確認: ' + (report.unverified.join(' / ') || '実機と本番公開はこの実行では確認していません。') + '\n' +
    '- 変更はPRで運営者確認後に反映。mainへの直接コミット・公開操作は行っていません。\n\n';
  if (!/^## 記録[^\n]*$/m.test(handoff)) fail('HANDOFF.mdの記録欄がありません。');
  handoff = handoff.replace(/(^## 記録[^\n]*\n)/m, '$1' + record);
  write(handoffPath, handoff.trimEnd() + '\n');
  git(ctx.repo, ['add', '-A']);
  git(ctx.repo, ['diff', '--cached', '--check']);
  const patch = git(ctx.repo, ['diff', '--cached', '--binary', '--full-index']);
  const stamp = tokyoStamp();
  const runId = String(ctx.env.GITHUB_RUN_ID || 'local'), attempt = String(ctx.env.GITHUB_RUN_ATTEMPT || '1');
  if (!/^(?:\d+|local)$/.test(runId) || !/^\d+$/.test(attempt)) fail('実行番号が不正です。');
  const branch = 'ai-auto/update-' + stamp + '-' + runId + '-' + attempt;
  const title = 'AI_INBOX自動実装 ' + report.completed.length + '件完了' + (report.blocked.length ? '・未完了' + report.blocked.length + '件' : '');
  const names = new Map(request.tasks.map(task => [task.id, task.title]));
  const body = [
    '## 何を変更したか',
    ...report.completed.map(item => '- ' + names.get(item.id) + '\n  - ' + item.summary + '\n  - 確認: ' + item.validation +
      (item.ai ? '\n  - 使用AI: ' + item.ai + ' / ' + item.model + (item.fallback ? '（Claudeの利用制限から切替）' : '') : '') +
      (item.output ? '\n  - 保存先: ' + item.output : '')),
    report.completed.length ? '' : '完了として報告できる実装はありません。以下の未完了事項を確認してください。',
    '\n## なぜ変更したか\nmainに登録されたAI_INBOXの未処理タスクを実装するためです。',
    '\n## 独立して確認したこと', ...checks.map(command => '- ' + command),
    '\n## AIからの追加検証報告', ...report.checks.map(check => '- ' + check),
    '\n## 実機で未確認の点',
    ...(report.unverified.length ? report.unverified : ['実機操作と本番公開は未確認です。']).map(item => '- ' + item),
    '\n## 未完了のタスク',
    ...(report.blocked.length ? report.blocked.map(item => '- ' + names.get(item.id) + ': ' + item.reason) : ['なし']),
    '\n自動マージはしません。内容とCIを確認したうえで、運営者がmainへマージしてください。',
    'GITHUB_TOKENで作成したPRのCIが承認待ちになる場合は「Approve workflows to run」から実行してください。'
  ].join('\n');
  assertNoSecrets(patch); assertNoSecrets(body);
  write(path.join(ctx.dir, 'proposal.patch'), patch);
  write(path.join(ctx.dir, 'pr-body.md'), body + '\n');
  write(path.join(ctx.dir, 'proposal.json'), JSON.stringify({
    baseSha: request.baseSha, branch, title, draft: report.blocked.length > 0, patchSha256: digest(patch)
  }));
  output(ctx, 'changed', 'true');
  summary(ctx, '共通チェック成功。完了' + report.completed.length + '件、未完了' + report.blocked.length + '件をPRへ渡します。');
}

export function publish(ctx = settings()) {
  const proposal = json(read(path.join(ctx.dir, 'proposal.json')), 'PR情報');
  const patchPath = path.join(ctx.dir, 'proposal.patch'), patch = read(patchPath);
  if (!/^[a-f0-9]{40}$/.test(proposal.baseSha) || git(ctx.repo, ['rev-parse', 'HEAD']).trim() !== proposal.baseSha ||
    !/^ai-auto\/(?:task|update)-\d{14}-(?:\d+|local)-\d+$/.test(proposal.branch) ||
    typeof proposal.title !== 'string' || proposal.title.length > 160 || typeof proposal.draft !== 'boolean' ||
    digest(patch) !== proposal.patchSha256) fail('PR用差分の出自または整合性を確認できません。');
  assertNoSecrets(patch); assertNoSecrets(read(path.join(ctx.dir, 'pr-body.md')));
  const existing = openPRs(ctx);
  if (existing.length) fail('別の自動PRがすでにあります。重複したPRは作りません。');
  git(ctx.repo, ['switch', '-c', proposal.branch]);
  git(ctx.repo, ['apply', '--index', '--', patchPath]);
  assertSafePaths(stagedFiles(ctx.repo));
  git(ctx.repo, ['diff', '--cached', '--check']);
  git(ctx.repo, ['-c', 'user.name=github-actions[bot]',
    '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com',
    '-c', 'core.hooksPath=/dev/null', 'commit', '-m', proposal.title]);
  // gh obtains the ephemeral job token from the environment; it is not stored in a remote URL.
  execFileSync('git', ['-c', 'credential.helper=!gh auth git-credential', 'push', 'origin', proposal.branch],
    { cwd: ctx.repo, env: ctx.env, stdio: 'inherit' });
  const args = ['pr', 'create', '--repo', ctx.env.GITHUB_REPOSITORY, '--base', 'main',
    '--head', proposal.branch, '--title', proposal.title, '--body-file', path.join(ctx.dir, 'pr-body.md')];
  if (proposal.draft) args.push('--draft');
  const url = execFileSync('gh', args, { cwd: ctx.repo, env: ctx.env, encoding: 'utf8' }).trim();
  summary(ctx, 'PRを作成しました: ' + url);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ctx = settings(), mode = process.argv[2];
  try {
    if (mode === 'prepare') prepare(ctx);
    else if (mode === 'export-draft') exportDraft(ctx);
    else if (mode === 'validate-draft') validateDraft(ctx);
    else if (mode === 'provider') {
      const provider = chooseProvider(ctx.env.AI_WORKER_PROVIDER || 'auto', !!ctx.env.ANTHROPIC_API_KEY, !!ctx.env.OPENAI_API_KEY);
      output(ctx, 'provider', provider); summary(ctx, '使用するAI: ' + provider);
    } else if (mode === 'claude') runClaude(ctx);
    else if (mode === 'finalize') finalize(ctx);
    else if (mode === 'publish') publish(ctx);
    else fail('prepare / export-draft / validate-draft / finalize / publish を指定してください。');
  } catch (error) {
    summary(ctx, '自動実装を停止しました: ' + error.message);
    process.exitCode = 1;
  }
}
