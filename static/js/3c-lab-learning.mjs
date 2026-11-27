import { TIP_ZONES, copyPositions, transformPositions, moveBall, rankConfigurations,
  pathLength, samplePath, makeDeck, tipZone, restoreProgress, viewFromHash } from './3c-lab-learning-core.mjs';

/* Original VIBES interface. All diagrams use the existing, locally built teaching data. */
function init() {
  const $ = (id) => document.getElementById(id);
  const root = document.querySelector('.l3'), stage = $('l3-workbench'), menu = $('l3-learning-menu');
  if (!root || !stage || !menu) return;
  let data;
  try { data = JSON.parse($('pc-data').textContent); } catch { return; }
  if (!data.cards?.length) return;
  const cards = data.cards, known = new Set(cards.map((c) => c.id)), byId = new Map(cards.map((c) => [c.id, c]));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const emit = (name, detail) => window.dispatchEvent(new CustomEvent('vibes:3c-' + name, { detail }));
  const KEY = 'vibes-3c-learning-v1';
  let progress = restoreProgress(null, known), canSave = true, favorites = [];
  try { progress = restoreProgress(JSON.parse(localStorage.getItem(KEY) || 'null'), known); } catch { canSave = false; }
  try { favorites = (JSON.parse(localStorage.getItem('vibes-3c-fav') || '[]')).filter((id) => known.has(id)); } catch {}
  let view = '', practiceCard = cards[0], quizCard = cards[0], level = '', favoritesOnly = false;
  const day = Math.floor(Date.now() / 86400000);
  let homeCard = cards[day % cards.length], selectedBall = 'cue', positions = copyPositions(cards[0].geo);
  let choice = '', answered = false, explanation = false, speed = 1, fraction = 0, raf = 0, lastFrame = 0;
  let drag = null;
  const decks = new Map(), reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const BALLS = [['cue', '手球（白）', '#FFFFFF'], ['o1', '第1的球（黄）', '#FACC15'], ['o2', '第2的球（赤）', '#F43F5E']];
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(progress)); } catch { canSave = false; }
  }
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; lastFrame = 0; }
  function activeCard() { return view === 'quiz' ? quizCard : view === 'practice' ? practiceCard : homeCard; }
  function pool() { return cards.filter((c) => (!level || c.level === level) && (!favoritesOnly || favorites.includes(c.id))); }
  function nextCard(kind, source, previous) {
    if (!source.length) return null;
    const key = kind + ':' + source.map((c) => c.id).join(',');
    let deck = decks.get(key);
    if (!deck?.length) deck = makeDeck(source.map((c) => c.id), previous);
    const id = deck.shift(); decks.set(key, deck);
    return byId.get(id);
  }
  function labels(c) {
    return '<div class="l3-labels"><span class="blue">' + esc(c.level) + '</span><span>' +
      esc(c.cat) + '</span><span>配置 #' + String(c.no).padStart(2, '0') + '</span></div>';
  }
  function board(geo, title, options = {}) {
    const p = (q) => [60 + q[0] * 100, 60 + q[1] * 100];
    const pointList = (a) => a.map((q) => p(q).join(',')).join(' ');
    let s = '<svg class="l3-board' + (options.edit ? ' editable' : '') + '" viewBox="0 0 920 520" role="img" aria-label="' + esc(title) + '">';
    s += '<rect width="920" height="520" rx="10" fill="#171A22"/><rect x="42" y="42" width="836" height="436" rx="8" fill="#153F78"/><rect x="60" y="60" width="800" height="400" fill="#1E5AA8"/>';
    for (let x = 1; x < 8; x++) s += '<path d="M' + (60 + x * 100) + ',60V460" stroke="#FFFFFF" stroke-opacity=".1" stroke-dasharray="4 7"/><circle cx="' + (60 + x * 100) + '" cy="26" r="3" fill="#F3F4EF"/><circle cx="' + (60 + x * 100) + '" cy="494" r="3" fill="#F3F4EF"/>';
    for (let y = 1; y < 4; y++) s += '<path d="M60,' + (60 + y * 100) + 'H860" stroke="#FFFFFF" stroke-opacity=".1" stroke-dasharray="4 7"/><circle cx="26" cy="' + (60 + y * 100) + '" r="3" fill="#F3F4EF"/><circle cx="894" cy="' + (60 + y * 100) + '" r="3" fill="#F3F4EF"/>';
    if (options.edit) {
      for (let x = 0; x <= 8; x++) s += '<text x="' + (60 + x * 100) + '" y="48" text-anchor="middle" fill="#F3F4EF" font-size="17">' + x + '</text>';
      for (let y = 0; y <= 4; y++) s += '<text x="48" y="' + (66 + y * 100) + '" text-anchor="end" fill="#F3F4EF" font-size="17">' + y + '</text>';
    }
    if (options.trace && geo.pre) {
      s += '<polyline points="' + pointList(geo.pre) + '" fill="none" stroke="#FFFFFF" stroke-width="3" stroke-linejoin="round"/><polyline points="' + pointList(geo.post) + '" fill="none" stroke="#38BDF8" stroke-width="3.5" stroke-linejoin="round"/>';
      geo.marks.forEach((q, i) => {
        const [x, y] = p(q);
        const tx = Math.max(78, Math.min(842, x)), ty = Math.max(78, Math.min(442, y));
        s += '<circle cx="' + tx + '" cy="' + ty + '" r="13" fill="#38BDF8"/><text x="' + tx + '" y="' + (ty + 6) + '" text-anchor="middle" font-size="18" fill="#111827">' + (i + 1) + '</text>';
      });
    }
    let cue = geo.cue, o1 = geo.o1;
    if (options.fraction != null && geo.pre) {
      const full = geo.pre.concat(geo.post.slice(1)), contact = pathLength(geo.pre) / pathLength(full);
      cue = samplePath(full, options.fraction);
      o1 = samplePath(geo.ob, Math.max(0, (options.fraction - contact) / (1 - contact || 1)));
    }
    for (const [key, label, color] of BALLS.slice().reverse()) {
      const [x, y] = p(key === 'cue' ? cue : key === 'o1' ? o1 : geo.o2);
      if (options.edit && selectedBall === key) s += '<circle cx="' + x + '" cy="' + y + '" r="22" fill="none" stroke="#F3F4EF" stroke-width="2" stroke-dasharray="5 4"/>';
      s += '<g' + (options.edit ? ' data-ball-key="' + key + '"' : '') + '><circle cx="' + x + '" cy="' + y + '" r="12" fill="' + color + '" stroke="#111827" stroke-width="2"/><circle cx="' + (x - 3) + '" cy="' + (y - 4) + '" r="3.5" fill="#FFFFFF" fill-opacity=".55"/>' + (options.edit ? '<circle cx="' + x + '" cy="' + y + '" r="25" fill="transparent"/>' : '') + '</g>';
    }
    return s + '</svg>';
  }
  function controls() {
    return '<div class="l3-actions"><button type="button" class="primary" data-action="play">軌道を再生</button><button type="button" data-action="reset-motion">最初に戻す</button><button type="button" data-action="step">1区間進む</button><label>再生速度<select id="l3-speed"><option value=".5"' + (speed === .5 ? ' selected' : '') + '>ゆっくり</option><option value="1"' + (speed === 1 ? ' selected' : '') + '>ふつう</option><option value="2"' + (speed === 2 ? ' selected' : '') + '>速い</option></select></label></div><p class="l3-help" id="l3-motion-status" aria-live="polite">白が手球、黄が第1的球、赤が第2的球。数字はクッションに入る順番です。</p>';
  }
  function note() {
    return '<p class="l3-note-box">軌道は登録カードの計算済みデータを順に示す模式表示です。実際の球速・回転・台の状態を再現するものではありません。実台では、基準の1球を撞いて合わせましょう。</p>';
  }
  function favoriteButton(c) {
    return '<button type="button" data-action="favorite" aria-pressed="' + favorites.includes(c.id) + '">' + (favorites.includes(c.id) ? '★ マイ帳面に保存済み' : '☆ マイ帳面に保存') + '</button>';
  }
  function answer(c) {
    return '<div class="l3-answer"><h3>この配置の基準</h3><p>' + esc(c.lead) + '</p><dl><dt>撞点</dt><dd>' + esc(c.tip) + '</dd><dt>厚み</dt><dd>' + esc(c.thick) + '</dd><dt>ヒネリ</dt><dd>' + esc(c.english) + '</dd><dt>強さ</dt><dd>' + esc(c.speed) + '</dd><dt>道順</dt><dd>' + esc(c.route) + '</dd></dl><div class="l3-actions"><button type="button" class="dark" data-action="open">カードの解説をひらく</button>' + favoriteButton(c) + '</div></div>';
  }
  function home() {
    const c = homeCard;
    return '<div class="l3-flow"><header><p class="eyebrow">スリークッションの練習室</p><h2 tabindex="-1">配置から、次の一球を。</h2><p class="muted">球を置いて探す。動きを見て考える。気になる形を、自分の練習につなげましょう。</p></header>' +
      '<article class="l3-panel"><div class="l3-panel-head"><h3>今日の1配置</h3>' + labels(c) + '</div><div class="l3-featured"><div id="l3-active-board">' + board(c.geo, c.name + 'の軌道', { trace: true }) + '</div><div class="l3-panel-body"><h3>' + esc(c.name) + '</h3><p>' + esc(c.lead) + '</p><div class="l3-actions"><button class="dark" type="button" data-action="open">解説を見る</button><button type="button" data-action="home-next">別の配置</button></div></div></div><div class="l3-panel-body">' + controls() + '</div></article>' +
      '<div class="l3-start-grid"><a href="#search" data-view="search"><b>配置を探す</b><p>3球を動かして、似た位置関係の配置を見つけます。</p><span class="count">' + cards.length + ' 配置</span></a><a href="#practice" data-view="practice"><b>ランダム練習</b><p>取り口を考えてから、撞点・厚み・道順を確認します。</p><span class="count">考える練習</span></a><a href="#quiz" data-view="quiz"><b>撞点クイズ</b><p>軌道を見て、手球のどこを撞くか考えてみましょう。</p><span class="count">9 つの向き</span></a></div>' +
      '<div class="l3-metrics"><div><small>見直した配置</small><b id="l3-reviewed-count">' + progress.reviewed.length + ' / ' + cards.length + '</b></div><div><small>クイズの正解</small><b id="l3-quiz-score">' + progress.correct + ' / ' + progress.attempts + '</b></div><div><small>マイ帳面</small><b id="l3-home-favorites">' + favorites.length + '</b></div></div>' +
      '<div class="l3-intro-links"><a href="#cards" data-view="cards">配置カード・取り口辞典</a><a href="#theory" data-view="theory">基礎理論を学ぶ</a><a href="#system" data-view="system">システムを計算する</a><a href="/pages/personal-data-note">練習の成績を記録する</a></div>' + note() + '<p class="l3-help" id="l3-storage-message">' + (canSave ? 'マイ帳面と学習状況は、この端末のブラウザ内に保存します。会員登録は不要です。' : 'このブラウザでは学習状況を保存できません。画面を閉じると今回の記録が消えます。') + '</p></div>';
  }
  function search() {
    return '<div class="l3-flow"><header><p class="eyebrow">配置検索</p><h2 tabindex="-1">3球を置いて、似た配置を探す</h2><p class="muted">球のボタンを選び、台をタップするか球をドラッグしてください。数字や矢印キーでも動かせます。</p></header><div class="l3-panel"><div id="l3-search-board" tabindex="0" role="group" aria-label="球の配置を編集。選んだ球を矢印キーで動かせます。">' + board(positions, '配置検索用の3球', { edit: true }) + '</div><div class="l3-panel-body"><div class="l3-ball-buttons">' + BALLS.map(([key, label, color]) => '<button type="button" data-action="select-ball" data-ball="' + key + '" aria-pressed="' + (key === selectedBall) + '"><span class="l3-ball-dot" style="--ball:' + color + '" aria-hidden="true"></span>' + label + '</button>').join('') +
      '</div><div class="l3-field-row"><label>選んだ球の横位置（0〜8）<input id="l3-ball-x" type="number" min=".14" max="7.86" step=".01" value="' + positions[selectedBall][0] + '"></label><label>選んだ球の縦位置（0〜4）<input id="l3-ball-y" type="number" min=".14" max="3.86" step=".01" value="' + positions[selectedBall][1] + '"></label></div><p class="l3-help" id="l3-position-status" aria-live="polite">左上が横0・縦0。矢印キーは0.1ずつ、Shiftと一緒なら0.5ずつ動きます。</p><div class="l3-actions"><button type="button" class="primary" data-action="search">この配置で探す</button><button type="button" data-action="flip-x">左右を反転</button><button type="button" data-action="flip-y">上下を反転</button><button type="button" data-action="reset-search">初めの配置に戻す</button></div></div></div>' +
      '<div><h3 id="l3-search-count" aria-live="polite"></h3><p class="l3-help">登録した' + cards.length + '配置の球の位置を比べ、近い順に表示します。左右・上下を反転した配置も含みます。取り口や得点の正解を判定する機能ではありません。</p></div><div id="l3-search-results" class="l3-result-grid"></div></div>';
  }
  function practice() {
    const c = practiceCard;
    const filters = '<div class="l3-field-row"><label>練習する難易度<select id="l3-practice-level"><option value="">すべて</option>' + data.levels.map((v) => '<option value="' + esc(v) + '"' + (level === v ? ' selected' : '') + '>' + esc(v) + '</option>').join('') + '</select></label><label>配置の選び方<select id="l3-practice-source"><option value="all">すべての配置</option><option value="favorites"' + (favoritesOnly ? ' selected' : '') + '>マイ帳面だけ</option></select></label></div>';
    const head = '<header><p class="eyebrow">ランダム練習</p><h2 tabindex="-1">取り口を考えてから、答えを見る</h2><p class="muted">同じ条件の配置を1巡するまでは重複せずに出します。実台で試したい形は、マイ帳面へ。</p></header>' + filters;
    if (!c || !pool().length) return '<div class="l3-flow">' + head + '<p class="l3-empty">この条件の配置はありません。難易度を変えるか、配置カードで★を付けてください。</p></div>';
    return '<div class="l3-flow">' + head + '<article class="l3-panel"><div class="l3-panel-head"><h3>' + esc(c.name) + '</h3>' + labels(c) + '</div><div id="l3-active-board">' + board(c.geo, c.name + 'の配置', { trace: explanation, fraction: 0 }) + '</div><div class="l3-panel-body">' + controls() + '<div class="l3-actions"><button class="dark" type="button" data-action="reveal">' + (explanation ? '基準の説明を隠す' : '基準の説明を見る') + '</button><button type="button" class="primary" data-action="practice-next">次の配置</button><button type="button" data-action="reviewed" aria-pressed="' + progress.reviewed.includes(c.id) + '">' + (progress.reviewed.includes(c.id) ? '見直し済み' : '見直した配置にする') + '</button></div></div></article>' + (explanation ? answer(c) : '<p class="l3-help">どのクッションへ入れるか、厚みや撞点はどうするか。先に自分の取り口を考えてみてください。</p>') + note() + '</div>';
  }
  function tipFigure(c) {
    const x = 60 + c.tipxy[0] * 48, y = 60 + c.tipxy[1] * 48;
    return '<svg class="l3-tip" viewBox="0 0 120 120" role="img" aria-label="基準の撞点：' + esc(c.tip) + '"><circle cx="60" cy="60" r="54" fill="#FFFFFF" stroke="#334155" stroke-width="2"/><path d="M6,60H114M60,6V114" stroke="#CBD5E1"/><circle cx="60" cy="60" r="32" fill="none" stroke="#CBD5E1" stroke-dasharray="3 4"/><circle cx="' + x + '" cy="' + y + '" r="8" fill="#1E5AA8"/></svg>';
  }
  function quizFeedback() {
    const correct = tipZone(quizCard.tipxy), label = TIP_ZONES.find(([key]) => key === correct)[1];
    return '<div class="l3-quiz-result" role="status"><strong>' + (choice === correct ? '正解です。' : 'この配置カードの基準は「' + label + '」です。') + '</strong><div class="l3-quiz-result-row">' + tipFigure(quizCard) + '<div><p>撞点：' + esc(quizCard.tip) + '</p><p>ヒネリ：' + esc(quizCard.english) + '</p></div></div><p class="l3-help">登録カードの基準との比較です。同じ配置でも、実際の台や撞き方によって合わせ方は変わります。</p><div class="l3-actions"><button type="button" data-action="open">厚み・道順も確認する</button>' + favoriteButton(quizCard) + '</div></div>';
  }
  function quiz() {
    const c = quizCard;
    return '<div class="l3-flow"><header><p class="eyebrow">撞点クイズ</p><h2 tabindex="-1">この軌道、どこを撞く？</h2><p class="muted">再生で球の動きを見て、手球の撞点の向きを選んでください。正解は、配置カードに登録された基準です。</p></header><div class="l3-panel"><div class="l3-panel-head"><h3>' + esc(c.name) + '</h3>' + labels(c) + '</div><div id="l3-active-board">' + board(c.geo, c.name + 'の軌道を見て撞点を考える', { trace: true }) + '</div><div class="l3-panel-body">' + controls() + '</div></div>' +
      '<fieldset style="border:0;padding:0;margin:0"><legend style="font-size:1rem;font-weight:900;margin-bottom:12px">手球のどの向きを撞きますか？</legend><div class="l3-quiz-choices" role="group" aria-label="撞点の向き">' + TIP_ZONES.map(([key, label]) => '<button type="button" data-action="quiz-choice" data-choice="' + key + '" aria-pressed="' + (choice === key) + '"' + (answered ? ' disabled' : '') + '>' + label + '</button>').join('') + '</div></fieldset>' +
      '<div class="l3-actions"><button type="button" class="primary" data-action="quiz-check"' + (!choice || answered ? ' disabled' : '') + '>答えを確認</button><button type="button" data-action="quiz-next">次の問題</button><span class="l3-help" id="l3-quiz-total">正解 ' + progress.correct + ' ／ 回答 ' + progress.attempts + '</span></div><div id="l3-quiz-feedback">' + (answered ? quizFeedback() : '') + '</div>' + note() + '</div>';
  }
  function results() {
    if (view !== 'search') return;
    const ranked = rankConfigurations(cards, positions);
    $('l3-search-count').textContent = '近い配置 ' + ranked.length + '件';
    $('l3-search-results').innerHTML = ranked.map((match, i) => {
      const c = match.card, geo = transformPositions(c.geo, match.flipX, match.flipY);
      return '<article class="l3-result"><button type="button" data-action="result-open" data-card="' + c.id + '" aria-label="' + esc(c.name) + 'の登録カードをひらく">' + board(geo, c.name + '、' + match.orientation) + '<span class="body"><span class="l3-labels"><span class="blue">' + (match.error < .03 ? 'ほぼ同じ位置関係' : '近い配置 ' + (i + 1)) + '</span><span>' + match.orientation + '</span></span><strong>' + esc(c.name) + '</strong><small>#' + c.no + ' ・ ' + esc(c.level) + ' ・ ' + esc(c.cat) + '</small></span></button></article>';
    }).join('');
  }
  function paintSearch(updateResults = true) {
    if (view !== 'search') return;
    $('l3-search-board').innerHTML = board(positions, '配置検索用の3球', { edit: true });
    stage.querySelectorAll('[data-action=select-ball]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.ball === selectedBall));
    $('l3-ball-x').value = positions[selectedBall][0]; $('l3-ball-y').value = positions[selectedBall][1];
    if (updateResults) results();
  }
  function drawMotion() {
    const el = $('l3-active-board'), c = activeCard();
    if (el && c) el.innerHTML = board(c.geo, c.name + 'の軌道の模式表示', { trace: true, fraction });
  }
  function play() {
    const button = stage.querySelector('[data-action=play]');
    if (raf) { stop(); button.textContent = '続きから再生'; $('l3-motion-status').textContent = '一時停止しています。'; return; }
    if (fraction >= 1) fraction = 0;
    if (reducedMotion.matches) {
      fraction = 1; drawMotion(); $('l3-motion-status').textContent = '動きを減らす設定のため、軌道の終点を表示しています。1区間ずつ確認できます。'; return;
    }
    button.textContent = '一時停止'; $('l3-motion-status').textContent = '軌道を再生しています。';
    function tick(now) {
      if (lastFrame) fraction = Math.min(1, fraction + (now - lastFrame) * speed / 6000);
      lastFrame = now; drawMotion();
      if (fraction < 1) raf = requestAnimationFrame(tick);
      else { stop(); button.textContent = 'もう一度再生'; $('l3-motion-status').textContent = '再生が終わりました。数字はクッションに入る順番です。'; }
    }
    raf = requestAnimationFrame(tick);
  }
  function render() {
    stop(); fraction = 0;
    stage.innerHTML = view === 'search' ? search() : view === 'practice' ? practice() : view === 'quiz' ? quiz() : home();
    if (view === 'search') results();
  }
  function setView(next, { keepHash = false, fromLegacy = false, focus = false } = {}) {
    const changed = view !== next; stop(); view = next;
    const legacyTab = { cards: 1, notebook: 1, system: 2, theory: 3 }[view];
    $('l3-legacy').hidden = !legacyTab; stage.hidden = !!legacyTab;
    for (const a of menu.querySelectorAll('[data-view]')) {
      if (a.dataset.view === view) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
    if (legacyTab) {
      if (!fromLegacy) emit('select-tab', legacyTab);
      if (!fromLegacy && (view === 'notebook' || changed && view === 'cards')) emit('filter-favorites', { only: view === 'notebook' });
    } else {
      if (changed && view === 'practice') { practiceCard = nextCard('practice', pool(), practiceCard?.id); explanation = false; }
      if (changed && view === 'quiz') { quizCard = nextCard('quiz', cards, quizCard?.id); choice = ''; answered = false; }
      render();
    }
    if (!keepHash) history.replaceState(null, '', '#' + view);
    if (focus) {
      const heading = legacyTab ? $('l3-legacy').querySelector('[role=tabpanel]:not([hidden]) h2') : stage.querySelector('h2');
      if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); heading.scrollIntoView({ block: 'start', behavior: 'auto' }); }
    }
  }
  function openCard(id) {
    if (!known.has(id)) return;
    setView('cards', { keepHash: true }); emit('open', { id });
  }
  function updateFavorites(ids) {
    favorites = ids.filter((id) => known.has(id));
    $('l3-favorite-count').textContent = favorites.length;
    if ($('l3-home-favorites')) $('l3-home-favorites').textContent = favorites.length;
    const c = activeCard();
    stage.querySelectorAll('[data-action=favorite]').forEach((b) => {
      b.setAttribute('aria-pressed', favorites.includes(c.id));
      b.textContent = favorites.includes(c.id) ? '★ マイ帳面に保存済み' : '☆ マイ帳面に保存';
    });
  }
  root.addEventListener('click', (event) => {
    const link = event.target.closest('a[data-view]');
    if (link) { event.preventDefault(); setView(link.dataset.view, { focus: true }); return; }
    const replay = event.target.closest('a[data-replay]');
    if (replay) {
      event.preventDefault(); $('pc-dx').click(); setView('practice', { keepHash: true, focus: true });
      practiceCard = byId.get(replay.dataset.replay) || practiceCard; explanation = true; render();
      history.replaceState(null, '', '#practice-' + practiceCard.id); return;
    }
    const b = event.target.closest('[data-action]');
    if (!b || !stage.contains(b) || b.disabled) return;
    const action = b.dataset.action, c = activeCard();
    if (action === 'open') openCard(c.id);
    if (action === 'result-open') openCard(b.dataset.card);
    if (action === 'favorite') emit('toggle-favorite', { id: c.id });
    if (action === 'play') play();
    if (action === 'reset-motion') { stop(); fraction = 0; drawMotion(); stage.querySelector('[data-action=play]').textContent = '軌道を再生'; $('l3-motion-status').textContent = '最初の配置に戻しました。'; }
    if (action === 'step') {
      stop(); const points = c.geo.pre.concat(c.geo.post.slice(1)), total = pathLength(points); let length = 0;
      for (let i = 1; i < points.length; i++) { length += pathLength([points[i - 1], points[i]]); if (length / total > fraction + .00001) { fraction = length / total; break; } }
      drawMotion(); stage.querySelector('[data-action=play]').textContent = '続きから再生'; $('l3-motion-status').textContent = '軌道を1区間進めました。';
    }
    if (action === 'home-next') { homeCard = nextCard('home', cards, homeCard.id); render(); }
    if (action === 'practice-next') { practiceCard = nextCard('practice', pool(), practiceCard?.id); explanation = false; render(); }
    if (action === 'reveal') { explanation = !explanation; render(); }
    if (action === 'reviewed') {
      progress.reviewed = progress.reviewed.includes(c.id) ? progress.reviewed.filter((id) => id !== c.id) : [...progress.reviewed, c.id];
      save(); b.setAttribute('aria-pressed', progress.reviewed.includes(c.id)); b.textContent = progress.reviewed.includes(c.id) ? '見直し済み' : '見直した配置にする';
    }
    if (action === 'quiz-choice' && !answered) {
      choice = b.dataset.choice;
      stage.querySelectorAll('[data-action=quiz-choice]').forEach((el) => el.setAttribute('aria-pressed', el.dataset.choice === choice));
      stage.querySelector('[data-action=quiz-check]').disabled = false;
    }
    if (action === 'quiz-check' && choice && !answered) {
      answered = true; progress.attempts++; if (choice === tipZone(c.tipxy)) progress.correct++; save();
      $('l3-quiz-feedback').innerHTML = quizFeedback(); $('l3-quiz-total').textContent = '正解 ' + progress.correct + ' ／ 回答 ' + progress.attempts;
      b.disabled = true; stage.querySelectorAll('[data-action=quiz-choice]').forEach((el) => { el.disabled = true; });
    }
    if (action === 'quiz-next') { quizCard = nextCard('quiz', cards, quizCard.id); choice = ''; answered = false; render(); }
    if (action === 'select-ball') { selectedBall = b.dataset.ball; paintSearch(false); }
    if (action === 'search') { results(); $('l3-position-status').textContent = '現在の3球の位置で、近い配置を表示しました。'; }
    if (action === 'flip-x' || action === 'flip-y') { positions = transformPositions(positions, action === 'flip-x', action === 'flip-y'); paintSearch(); }
    if (action === 'reset-search') { positions = copyPositions(cards[0].geo); paintSearch(); }
  });
  stage.addEventListener('change', (event) => {
    const id = event.target.id;
    if (id === 'l3-speed') speed = Number(event.target.value);
    if (id === 'l3-practice-level' || id === 'l3-practice-source') {
      level = $('l3-practice-level').value; favoritesOnly = $('l3-practice-source').value === 'favorites';
      practiceCard = nextCard('practice', pool(), practiceCard?.id); explanation = false; render();
    }
    if (id === 'l3-ball-x' || id === 'l3-ball-y') {
      const point = [$('l3-ball-x').valueAsNumber, $('l3-ball-y').valueAsNumber];
      const next = moveBall(positions, selectedBall, point);
      if (next) positions = next;
      paintSearch(); $('l3-position-status').textContent = next ? '選んだ球の位置を更新しました。' : '有効な数字を入れ、球どうしが重ならない位置にしてください。';
    }
  });
  function moveFromPointer(event) {
    const rect = $('l3-search-board').querySelector('svg').getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * 920, y = (event.clientY - rect.top) / rect.height * 520;
    if (x < 60 || x > 860 || y < 60 || y > 460) return;
    const next = moveBall(positions, selectedBall, [(x - 60) / 100, (y - 60) / 100]);
    if (next) { positions = next; paintSearch(false); }
  }
  stage.addEventListener('pointerdown', (event) => {
    const host = event.target.closest('#l3-search-board');
    if (view !== 'search' || !host || event.button !== 0) return;
    event.preventDefault(); selectedBall = event.target.closest('[data-ball-key]')?.dataset.ballKey || selectedBall;
    drag = event.pointerId; host.setPointerCapture(event.pointerId); moveFromPointer(event);
  });
  stage.addEventListener('pointermove', (event) => { if (drag === event.pointerId) moveFromPointer(event); });
  stage.addEventListener('pointerup', (event) => { if (drag === event.pointerId) { drag = null; paintSearch(); $('l3-position-status').textContent = '球の位置を更新して、近い配置を並べました。'; } });
  stage.addEventListener('pointercancel', () => { drag = null; if (view === 'search') paintSearch(); });
  stage.addEventListener('keydown', (event) => {
    if (view !== 'search' || !event.target.closest('#l3-search-board')) return;
    const delta = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (!delta) return;
    event.preventDefault(); const n = event.shiftKey ? .5 : .1;
    const next = moveBall(positions, selectedBall, positions[selectedBall].map((v, i) => v + delta[i] * n));
    if (next) positions = next; paintSearch();
  });
  window.addEventListener('vibes:3c-tab', (e) => {
    const mode = { 1: view === 'notebook' ? 'notebook' : 'cards', 2: 'system', 3: 'theory' }[e.detail];
    if (mode) setView(mode, { keepHash: true, fromLegacy: true });
  });
  window.addEventListener('vibes:3c-favorites', (e) => { if (Array.isArray(e.detail)) updateFavorites(e.detail); });
  window.addEventListener('storage', (e) => {
    if (e.key === 'vibes-3c-fav') { try { updateFavorites(JSON.parse(e.newValue || '[]')); } catch {} }
    if (e.key === KEY) { try { progress = restoreProgress(JSON.parse(e.newValue || 'null'), known); } catch {} }
  });
  window.addEventListener('hashchange', () => {
    const next = viewFromHash(location.hash);
    const match = /^#practice-(.+)$/.exec(location.hash);
    setView(next, { keepHash: true });
    if (match && known.has(match[1])) { practiceCard = byId.get(match[1]); explanation = true; render(); }
    const position = /^#pos-(.+)$/.exec(location.hash);
    if (position && known.has(position[1])) emit('open', { id: position[1] });
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden && raf) { stop(); const b = stage.querySelector('[data-action=play]'); if (b) b.textContent = '続きから再生'; } });
  root.classList.add('l3-enhanced'); menu.hidden = false; updateFavorites(favorites);
  const first = viewFromHash(location.hash), replay = /^#practice-(.+)$/.exec(location.hash);
  setView(first, { keepHash: true });
  if (replay && known.has(replay[1])) { practiceCard = byId.get(replay[1]); explanation = true; render(); }
}
init();
