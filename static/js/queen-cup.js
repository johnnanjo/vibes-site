/* Shared settings and display state for the operator-approved W3C preset. */
(function () {
  'use strict';

  var ID = 'w3c-queen';
  var TITLE = 'W3C PRE QUEEN CUP 2026';

  function active(config) {
    return !!config && config.preset === ID;
  }

  function preset() {
    return {
      preset: ID,
      mode: '3c',
      h: [25, 25],
      limit: 35,
      back: true,
      clk: 40,
      warn: true,
      to: 2,
      stats: true,
      brk: 'alt',
      end: 'pts',
      title: TITLE
    };
  }

  function status(state) {
    var config = state.cfg || {};
    var first = state.p[0];
    var playing = active(config) && !state.over;
    return {
      final: !!(playing && config.limit && state.inn >= config.limit),
      equalizing: !!(playing && config.back && first.h > 0 && first.s >= first.h)
    };
  }

  /* Older saved states only have a count. Their used slots are the first ones. */
  function usedMask(player) {
    if (player.ext != null) return player.ext & 3;
    return (1 << Math.max(0, Math.min(2, player.to | 0))) - 1;
  }

  function extend(player, slot) {
    if (slot !== 0 && slot !== 1) return false;
    var mask = usedMask(player);
    if (mask & (1 << slot)) return false;
    player.ext = mask | (1 << slot);
    player.to = (player.ext & 1) + ((player.ext >> 1) & 1);
    return true;
  }

  window.VibesQueenCup = {
    id: ID,
    title: TITLE,
    active: active,
    preset: preset,
    status: status,
    usedMask: usedMask,
    extend: extend
  };
})();
