/* One score owner; signed referee commands never carry the QR pairing key. */
(function (root) {
  'use strict';
  function random() { var b = new Uint8Array(32); root.crypto.getRandomValues(b); return Array.from(b, function (x) { return x.toString(16).padStart(2, '0'); }).join(''); }
  function signer(secret) {
    if (!/^[a-f0-9]{64}$/.test(secret) || !root.crypto || !root.crypto.subtle) throw new Error('secure-context-required');
    var raw = new Uint8Array(secret.match(/../g).map(function (x) { return parseInt(x, 16); }));
    var key = root.crypto.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
    function bytes(o) { var body = {}; Object.keys(o).forEach(function (k) { if (k !== 'sig') body[k] = o[k]; }); return new TextEncoder().encode(JSON.stringify(body)); }
    return {
      sign: async function (o) { var b = await root.crypto.subtle.sign('HMAC', await key, bytes(o)); return Object.assign({}, o, { sig: Array.from(new Uint8Array(b), function (x) { return x.toString(16).padStart(2, '0'); }).join('') }); },
      verify: async function (o) { if (!o || !/^[a-f0-9]{64}$/.test(o.sig || '')) return false; try { return await root.crypto.subtle.verify('HMAC', await key, new Uint8Array(o.sig.match(/../g).map(function (x) { return parseInt(x, 16); })), bytes(o)); } catch (e) { return false; } }
    };
  }
  function Host(options) {
    this.options = options; this.storage = options.storage || root.localStorage; this.keyName = 'vibes-event-referee:' + options.match;
    var saved = null; try { saved = JSON.parse(this.storage.getItem(this.keyName) || 'null'); } catch (e) {}
    this.state = saved && /^[a-f0-9]{64}$/.test(saved.key || '') ? saved : { key: random() };
    var s = this.state;
    s.client = /^[a-f0-9]{64}$/.test(s.client || '') ? s.client : '';
    ['seq', 'rev', 'seen'].forEach(function (k) { if (!Number.isSafeInteger(s[k]) || s[k] < 0) s[k] = 0; });
    this.signer = signer(this.state.key); this.chain = Promise.resolve(); this.persist();
  }
  Host.prototype.persist = function () { this.storage.setItem(this.keyName, JSON.stringify(this.state)); };
  Host.prototype.online = function () { return !!this.state.client && Date.now() - this.state.seen < 12000; };
  Host.prototype.url = function (origin) { return origin + '/event-score-referee/?match=' + encodeURIComponent(this.options.match) + '#key=' + this.state.key; };
  Host.prototype.reply = async function (client, ack, ok, error) {
    var payload = { type: 'referee-state', m: this.options.match, client: client, owner: client === this.state.client, ack: ack, rev: this.state.rev, ok: ok, error: error || '', view: this.options.view() };
    this.options.send(await this.signer.sign(payload));
  };
  Host.prototype.receive = function (m) {
    var self = this;
    this.chain = this.chain.catch(function () {}).then(async function () {
      if (!self.options.active() || !m || m.type !== 'referee-command' || m.m !== self.options.match || !/^[a-f0-9]{64}$/.test(m.client || '') || !Number.isSafeInteger(m.seq) || m.seq < 0 || !(await self.signer.verify(m))) return false;
      var s = self.state, handshake = m.op === 'hello' || m.op === 'ping';
      if (s.client !== m.client) {
        if (m.op !== 'hello' || self.online()) { await self.reply(m.client, m.seq, false, '別の審判が操作中です。接続が切れた場合は少し待ってつなぎ直してください。'); return false; }
        s.client = m.client; s.seq = 0;
      }
      s.seen = Date.now();
      if (handshake) { self.persist(); await self.reply(m.client, s.seq, true); if (self.options.changed) self.options.changed(); return true; }
      if (m.seq <= s.seq) { await self.reply(m.client, s.seq, true); return false; }
      s.seq = m.seq;
      if (m.base !== s.rev) { self.persist(); await self.reply(m.client, m.seq, false, '画面が更新されました。最新の表示を確認して、もう一度操作してください。'); return false; }
      var accepted = !!self.options.apply(m.op, m.arg || {});
      if (accepted) s.rev++;
      self.persist(); await self.reply(m.client, m.seq, accepted, accepted ? '' : 'この状態では操作できません。画面を確認してください。');
      if (self.options.changed) self.options.changed();
      return accepted;
    });
    return this.chain;
  };
  root.VibesEventReferee = { random: random, signer: signer, Host: Host };
})(window);
