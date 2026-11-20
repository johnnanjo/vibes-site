/* Full-match camera recordings. Files stay in the folder explicitly chosen on this PC. */
(function (root) {
  'use strict';

  function videoTrack(stream) {
    return stream && stream.getVideoTracks().filter(function (track) { return track.readyState === 'live'; })[0];
  }

  function gameOf(state, stream, mirror) {
    return { id: String(state.recordId || ''), startedAt: +state.t0 || 0, active: !mirror && !!state.t0 && !state.ready && !state.over,
      finished: !!state.over, stream: stream, table: state.recordTable || 0 };
  }

  function create(options) {
    options = options || {};
    var Recorder = options.MediaRecorder || root.MediaRecorder;
    var Stream = options.MediaStream || root.MediaStream;
    var choose = options.chooseDirectory || (root.showDirectoryPicker && root.showDirectoryPicker.bind(root));
    var now = options.now || Date.now, serial = 0, parts = Object.create(null);
    var directory = null, enabled = false, selecting = false, session = null, desired = null, observedTrack = null;
    var phase = 'off', message = '', lastFile = '', blockedTrack = null, work = Promise.resolve();

    function info() {
      return { supported: !!(Recorder && Stream && choose), enabled: enabled, selecting: selecting,
        phase: phase, message: message, folder: directory ? directory.name : '', filename: session ? session.name : lastFile,
        busy: !!session, seconds: session && session.at ? Math.max(0, Math.floor((now() - session.at) / 1000)) : 0 };
    }
    function emit() { if (options.onChange) { try { options.onChange(info()); } catch (e) {} } }
    function status(next, text) { phase = next; message = text || ''; emit(); }
    function schedule() {
      work = work.then(reconcile).catch(function () {
        enabled = false; status('error', '録画を続けられませんでした。保存先とカメラを確認して、準備し直してください。');
      });
      return work;
    }
    function mimeType() {
      var types = ['video/webm;codecs=vp8', 'video/webm;codecs=vp9', 'video/webm', 'video/mp4'];
      for (var i = 0; i < types.length; i++) if (!Recorder.isTypeSupported || Recorder.isTypeSupported(types[i])) return types[i];
      return '';
    }
    function filename(table, mime) {
      var d = new Date(now()), pad = function (n, len) { return String(n).padStart(len || 2, '0'); };
      var token = root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
      return 'VIBES-' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + '-' + pad(d.getMilliseconds(), 3) +
        (table ? '-T' + table : '') + '-' + (++serial) + '-' + token + (/mp4/.test(mime) ? '.mp4' : '.webm');
    }
    async function newFile(table, mime) {
      /* Never truncate a file already in the chosen folder, including after a reload. */
      for (var i = 0; i < 10; i++) {
        var name = filename(table, mime);
        try { await directory.getFileHandle(name); }
        catch (e) {
          if (e.name !== 'NotFoundError') throw e;
          return { name: name, handle: await directory.getFileHandle(name, { create: true }) };
        }
      }
      throw new Error('filename collision');
    }
    function requestStop(item, reason) {
      if (item.stopping) return item.done;
      item.stopping = true; item.reason = reason;
      status('saving', '動画を保存しています。この画面を開いたままお待ちください。');
      if (item.recorder && item.started) {
        /* An inactive recorder can still have its final data/stop events queued. */
        try { if (item.recorder.state !== 'inactive') item.recorder.stop(); } catch (e) { item.failure = true; finalize(item); }
      } else finalize(item);
      return item.done;
    }
    async function finalize(item) {
      if (item.finalizing) return;
      item.finalizing = true;
      await item.writes;
      var closed = false;
      try { if (item.writer) { await item.writer.close(); closed = true; } }
      catch (e) { item.failure = true; }
      if (item.ownedTrack) item.ownedTrack.stop();
      if (item.failure) enabled = false;
      if (session === item) session = null;
      var interrupted = item.reason !== 'finished' || item.partial;
      if (closed && item.bytes > 0) {
        lastFile = item.name;
        if (options.onSaved) { try { options.onSaved({ name: item.name, bytes: item.bytes,
          partial: interrupted || item.failure, handle: item.handle }); } catch (e) {} }
      }
      if (item.failure) status('error', '録画・保存に失敗しました。保存先の空き容量と権限を確認してください。途中の動画が残る場合があります。');
      else if (closed && item.bytes > 0) status(enabled ? 'waiting' : 'off',
        (interrupted ? '試合の一部の映像を保存しました。' : '試合の動画を保存しました。') + item.name);
      else status(enabled ? 'waiting' : 'off', '録画できる映像がありませんでした。カメラを確認してください。');
      item.resolve();
      /* A new game may have started while the preceding file was being closed. */
      schedule();
    }
    async function start(game, track) {
      var item = { id: game.id, track: track, name: '', recorder: null, writer: null, handle: null,
        at: 0, writes: Promise.resolve(), bytes: 0, queued: 0, failure: false, reason: '', stopping: false,
        partial: (parts[game.id] || 0) > 0 || (!!game.startedAt && now() - game.startedAt > 2500) };
      item.done = new Promise(function (resolve) { item.resolve = resolve; });
      session = item; status('starting', '録画を始めています。');
      try {
        var mime = mimeType(), file = await newFile(game.table, mime);
        item.name = file.name; item.handle = file.handle;
        item.writer = await file.handle.createWritable();
        /* Do not start a stale game after a slow folder/permission operation. */
        if (!enabled || !desired || !desired.active || desired.id !== game.id || videoTrack(desired.stream) !== track) {
          await requestStop(item, 'cancelled'); return;
        }
        var recordingTrack = track.clone ? track.clone() : track;
        if (recordingTrack !== track) item.ownedTrack = recordingTrack;
        var media = new Stream([recordingTrack]);
        item.recorder = new Recorder(media, Object.assign({ videoBitsPerSecond: 2500000 }, mime ? { mimeType: mime } : {}));
        item.recorder.ondataavailable = function (event) {
          if (!event.data || !event.data.size || item.failure) return;
          item.queued += event.data.size;
          item.writes = item.writes.then(async function () {
            if (!item.failure) { await item.writer.write(event.data); item.bytes += event.data.size; }
          }).catch(function () { item.failure = true; requestStop(item, 'error'); })
            .then(function () { item.queued -= event.data.size; });
          /* Stop with an explicit error instead of buffering an entire match in RAM. */
          if (item.queued > 64 * 1024 * 1024) { item.failure = true; requestStop(item, 'error'); }
        };
        item.recorder.onerror = function () { item.failure = true; requestStop(item, 'error'); };
        item.recorder.onstop = function () {
          if (!item.stopping) { item.reason = 'camera'; blockedTrack = item.track; }
          finalize(item);
        };
        item.at = now(); item.recorder.start(2000); item.started = true;
        parts[game.id] = (parts[game.id] || 0) + 1;
        status('recording', '試合を録画しています。終了すると自動で保存します。');
      } catch (e) {
        item.failure = true; enabled = false;
        await requestStop(item, 'error');
      }
    }
    async function reconcile() {
      var game = desired, track = game && videoTrack(game.stream);
      if (session && (!enabled || !game || !game.active || session.id !== game.id || session.track !== track)) {
        await requestStop(session, game && game.finished && session.id === game.id ? 'finished' : 'interrupted');
      }
      game = desired; track = game && videoTrack(game.stream);
      if (enabled && !session && game && game.active && track && track !== blockedTrack) await start(game, track);
      else if (enabled && !session && phase !== 'error') {
        if (game && game.active && (!track || track === blockedTrack)) status('waiting', '試合中ですが、録画できるカメラ映像を待っています。接続後から録画します。');
        else if (!message || /待っています/.test(message)) status('waiting', '録画待機中。試合開始で録画し、試合終了で保存します。');
      }
    }
    return {
      info: info,
      update: function (game) {
        var before = desired, beforeTrack = observedTrack; desired = game; observedTrack = game && videoTrack(game.stream);
        /* A source track can end in place while its recording clone remains live. */
        if (!before || !game || before.id !== game.id || before.active !== game.active || before.finished !== game.finished || beforeTrack !== observedTrack) return schedule();
        return work;
      },
      arm: async function () {
        if (session || selecting) return false;
        if (!info().supported) { status('error', '試合の自動保存は、このPCのChromeまたはEdgeで使ってください。'); return false; }
        selecting = true; emit();
        try {
          /* Keep the directory picker in the click's user activation. */
          var picked = await choose({ mode: 'readwrite', id: 'vibes-match-recordings', startIn: 'videos' });
          if (picked.queryPermission && await picked.queryPermission({ mode: 'readwrite' }) !== 'granted') throw new Error('permission');
          directory = picked; enabled = true; blockedTrack = null;
          status('waiting', '録画待機中。試合開始で録画し、試合終了で保存します。');
          await schedule(); return true;
        } catch (e) {
          if (e.name !== 'AbortError') status('error', '保存先を選べませんでした。このPCのChromeまたはEdgeで、書き込みを許可してください。');
          return false;
        } finally { selecting = false; emit(); }
      },
      disable: function () { enabled = false; status(session ? 'saving' : 'off', '自動録画を切りました。'); return schedule(); },
      settled: function () { return work; }
    };
  }

  root.VibesMatchRecorder = { create: create, gameOf: gameOf };
})(typeof window !== 'undefined' ? window : globalThis);
