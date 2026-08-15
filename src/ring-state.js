'use strict';

// Pure ring-state management for nested cxtmenu rings.
//
// The visible rings always form a single hierarchical chain:
// root -> submenu -> sub-submenu -> ...  A ring is
// { level, commands, sourcePath } where sourcePath is the command-index path
// from the root to the ring's owner command.
//
// Pinning freezes the whole menu: after dwelling on one command for the pin
// delay, the menu stops reacting (the pointer can disengage).  Re-engaging
// starts a release countdown; when it completes, the menu reacts normally
// again.

const pathsEqual = (a, b) =>
  a.length === b.length && a.every((value, i) => value === b[i]);

const cloneRing = ring => ({
  level: ring.level,
  commands: ring.commands,
  sourcePath: ring.sourcePath.slice()
});

const makeState = (rings, extra) => ({
  rings: rings.map((ring, i) => {
    const clone = cloneRing(ring);
    clone.level = i;
    return clone;
  }),
  pointerPath: extra.pointerPath ? extra.pointerPath.slice() : null,
  dwellSince: extra.dwellSince != null ? extra.dwellSince : null,
  frozen: extra.frozen === true,
  releaseStartedAt: extra.releaseStartedAt != null ? extra.releaseStartedAt : null
});

function createState(commands){
  return makeState(
    [ { level: 0, commands, sourcePath: [] } ],
    {}
  );
}

// A command declares a submenu solely via a `subcommands` array.
function childCommands(command){
  if( !command || !Array.isArray(command.subcommands) ){
    return null;
  }

  return command.subcommands;
}

// Pointer highlighted the command at (ringIndex, commandIndex).
// Truncates the chain to that ring, then opens the command's submenu (if any)
// as the next outer ring.  `now` feeds the dwell timer for freezing.
function enterCommand(state, ringIndex, commandIndex, subcommands, now){
  const path = state.rings[ringIndex].sourcePath.concat([ commandIndex ]);
  const samePointer = !!state.pointerPath && pathsEqual(state.pointerPath, path);
  const rings = state.rings.slice(0, ringIndex + 1);

  if( Array.isArray(subcommands) ){
    rings.push({
      level: rings.length,
      commands: subcommands,
      sourcePath: path
    });
  }

  return makeState(rings, {
    pointerPath: path,
    dwellSince: samePointer ? state.dwellSince : now,
    frozen: state.frozen,
    releaseStartedAt: state.releaseStartedAt
  });
}

// Pointer moved (while engaged) without changing the highlighted command:
// restart the stillness anchor so the freeze countdown only runs while the
// pointer is at one location.
function restartDwell(state, now){
  if( state.frozen || state.dwellSince == null ){
    return state;
  }

  return makeState(state.rings, {
    pointerPath: state.pointerPath,
    dwellSince: now,
    frozen: false,
    releaseStartedAt: state.releaseStartedAt
  });
}

// Pointer left the ring band at ringIndex (moved inward / outside).
// Drops that ring and everything outside it; the root always stays.
function leaveCommand(state, ringIndex){
  const keep = Math.max(1, ringIndex);

  return makeState(state.rings.slice(0, keep), {
    frozen: state.frozen,
    releaseStartedAt: state.releaseStartedAt
  });
}

// Advance timers: stillness + dwell -> frozen; release countdown -> unfrozen.
// The freeze countdown starts only after the pointer stayed still for
// `stillDelay` ms, then takes `pinDelay` ms to complete.
function tick(state, now, pinDelay, stillDelay){
  const still = stillDelay || 0;

  if( state.releaseStartedAt != null && now >= state.releaseStartedAt + pinDelay ){
    return makeState(state.rings, {
      pointerPath: state.pointerPath,
      dwellSince: null,
      frozen: false,
      releaseStartedAt: null
    });
  }

  if( !state.frozen && state.dwellSince != null && now >= state.dwellSince + still + pinDelay ){
    return makeState(state.rings, {
      pointerPath: state.pointerPath,
      dwellSince: null,
      frozen: true,
      releaseStartedAt: null
    });
  }

  return state;
}

// Pointer re-engaged on a frozen menu: start the release countdown.
function beginRelease(state, now){
  if( !state.frozen ){
    return state;
  }

  return makeState(state.rings, {
    pointerPath: state.pointerPath,
    dwellSince: null,
    frozen: true,
    releaseStartedAt: now
  });
}

// Immediate release, e.g. the pointer moved while engaged on a frozen menu.
function releaseNow(state){
  if( !state.frozen ){
    return state;
  }

  return makeState(state.rings, {
    pointerPath: state.pointerPath,
    dwellSince: null,
    frozen: false,
    releaseStartedAt: null
  });
}

// Pointer disengaged during the release countdown: stay frozen.
function cancelRelease(state){
  if( !state.frozen ){
    return state;
  }

  return makeState(state.rings, {
    pointerPath: state.pointerPath,
    dwellSince: null,
    frozen: true,
    releaseStartedAt: null
  });
}

const clamp01 = value => Math.max(0, Math.min(1, value));

// Indicator state: { kind: 'freeze'|'frozen'|'release', fraction } or null.
// The freeze indicator stays hidden until the pointer was still for stillDelay.
function pinProgress(state, now, pinDelay, stillDelay){
  const still = stillDelay || 0;

  if( state.releaseStartedAt != null ){
    return { kind: 'release', fraction: clamp01((now - state.releaseStartedAt) / pinDelay) };
  }

  if( state.frozen ){
    return { kind: 'frozen', fraction: 1 };
  }

  if( state.dwellSince != null && now >= state.dwellSince + still ){
    return { kind: 'freeze', fraction: clamp01((now - state.dwellSince - still) / pinDelay) };
  }

  return null;
}

module.exports = {
  createState,
  childCommands,
  enterCommand,
  leaveCommand,
  restartDwell,
  tick,
  beginRelease,
  cancelRelease,
  releaseNow,
  pinProgress
};
