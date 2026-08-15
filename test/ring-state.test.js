'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
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
} = require('../src/ring-state');

const command = (content, subcommands = null) => ({ content, ...(subcommands ? { subcommands } : {}) });

const commands = [
  command('A', [command('A1', [command('A1a')]), command('A2')]),
  command('B', [command('B1')]),
  command('C')
];

const PIN = 500;
const STILL = 300;

const freeze = (state, at = 100) =>
  tick(enterCommand(state, 0, 0, commands[0].subcommands, at), at + STILL + PIN, PIN, STILL);

describe('nested cxtmenu ring state', () => {
  it('creates a root ring only, unfrozen', () => {
    const state = createState(commands);
    assert.equal(state.rings.length, 1);
    assert.equal(state.rings[0].level, 0);
    assert.equal(state.frozen, false);
    assert.equal(state.releaseStartedAt, null);
  });

  it('recognises subcommands without mutating commands', () => {
    assert.equal(childCommands(commands[0]), commands[0].subcommands);
    assert.equal(childCommands(commands[2]), null);
  });

  it('opens a submenu ring when entering a command with subcommands', () => {
    const state = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    assert.deepEqual(state.rings.map(ring => ring.sourcePath), [[], [0]]);
    assert.deepEqual(state.pointerPath, [0]);
  });

  it('replaces a sibling submenu instead of accumulating rings', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const b = enterCommand(a, 0, 1, commands[1].subcommands, 200);
    assert.deepEqual(b.rings.map(ring => ring.sourcePath), [[], [1]]);
  });

  it('truncates to the root when entering a plain command', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const c = enterCommand(a, 0, 2, null, 200);
    assert.deepEqual(c.rings.map(ring => ring.sourcePath), [[]]);
  });

  it('builds a strictly hierarchical chain for nested submenus', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const nested = enterCommand(a, 1, 0, commands[0].subcommands[0].subcommands, 200);
    assert.deepEqual(nested.rings.map(ring => ring.sourcePath), [[], [0], [0, 0]]);
  });

  it('drops deeper rings when moving back inward', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const nested = enterCommand(a, 1, 0, commands[0].subcommands[0].subcommands, 200);
    const b = enterCommand(nested, 0, 1, commands[1].subcommands, 300);
    assert.deepEqual(b.rings.map(ring => ring.sourcePath), [[], [1]]);
  });

  it('keeps the dwell start while staying on the same command', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const still = enterCommand(a, 0, 0, commands[0].subcommands, 300);
    assert.equal(still.dwellSince, 100);
  });

  it('restarts the dwell when entering a different command', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const b = enterCommand(a, 0, 1, commands[1].subcommands, 300);
    assert.equal(b.dwellSince, 300);
  });

  it('restartDwell resets the stillness anchor on pointer movement', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const moved = restartDwell(a, 400);
    assert.equal(moved.dwellSince, 400);
  });

  it('restartDwell is a no-op without a dwell or when frozen', () => {
    const idle = createState(commands);
    assert.equal(restartDwell(idle, 400).dwellSince, null);
    const frozen = freeze(createState(commands));
    assert.equal(restartDwell(frozen, 400).frozen, true);
    assert.equal(restartDwell(frozen, 400).dwellSince, null);
  });

  it('leaveCommand truncates rings and clears the dwell', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const left = leaveCommand(a, 1);
    assert.deepEqual(left.rings.map(ring => ring.sourcePath), [[]]);
    assert.equal(left.dwellSince, null);
    assert.equal(left.pointerPath, null);
  });

  it('leaveCommand never drops the root ring', () => {
    const left = leaveCommand(createState(commands), 0);
    assert.equal(left.rings.length, 1);
  });

  it('does not freeze before still delay plus pin delay elapsed', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const ticked = tick(a, 100 + STILL + PIN - 1, PIN, STILL);
    assert.equal(ticked.frozen, false);
  });

  it('freezes after being still for stillDelay plus pinDelay', () => {
    const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    const ticked = tick(a, 100 + STILL + PIN, PIN, STILL);
    assert.equal(ticked.frozen, true);
    assert.equal(ticked.dwellSince, null);
  });

  it('keeps the rings as-is when frozen', () => {
    const frozen = freeze(createState(commands));
    assert.deepEqual(frozen.rings.map(ring => ring.sourcePath), [[], [0]]);
  });

  it('tick without a dwell changes nothing', () => {
    const state = createState(commands);
    assert.equal(tick(state, 1000, PIN, STILL), state);
  });

  it('ignores beginRelease when not frozen', () => {
    const state = createState(commands);
    assert.equal(beginRelease(state, 100).releaseStartedAt, null);
  });

  it('unfreezes only after the release countdown', () => {
    const frozen = freeze(createState(commands));
    const releasing = beginRelease(frozen, 2000);
    assert.equal(releasing.releaseStartedAt, 2000);
    const early = tick(releasing, 2000 + PIN - 1, PIN, STILL);
    assert.equal(early.frozen, true);
    const released = tick(releasing, 2000 + PIN, PIN, STILL);
    assert.equal(released.frozen, false);
    assert.equal(released.releaseStartedAt, null);
  });

  it('releaseNow unfreezes immediately', () => {
    const frozen = freeze(createState(commands));
    const released = releaseNow(frozen);
    assert.equal(released.frozen, false);
    assert.equal(released.releaseStartedAt, null);
  });

  it('releaseNow also cuts a running release countdown short', () => {
    const releasing = beginRelease(freeze(createState(commands)), 2000);
    const released = releaseNow(releasing);
    assert.equal(released.frozen, false);
    assert.equal(released.releaseStartedAt, null);
  });

  it('releaseNow is a no-op when not frozen', () => {
    const state = createState(commands);
    assert.equal(releaseNow(state), state);
  });

  it('cancelRelease keeps the menu frozen', () => {
    const releasing = beginRelease(freeze(createState(commands)), 2000);
    const cancelled = cancelRelease(releasing);
    assert.equal(cancelled.frozen, true);
    assert.equal(cancelled.releaseStartedAt, null);
  });

  it('does not mutate the input state', () => {
    const state = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
    enterCommand(state, 0, 2, null, 200);
    leaveCommand(state, 1);
    restartDwell(state, 300);
    tick(state, 100 + STILL + PIN, PIN, STILL);
    assert.equal(state.rings.length, 2);
    assert.equal(state.frozen, false);
    assert.equal(state.dwellSince, 100);
  });

  describe('pinProgress', () => {
    it('answers null when idle', () => {
      assert.equal(pinProgress(createState(commands), 100, PIN, STILL), null);
    });

    it('stays hidden until the pointer was still for stillDelay', () => {
      const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
      assert.equal(pinProgress(a, 100 + STILL - 1, PIN, STILL), null);
    });

    it('reports the freeze countdown fraction after the still delay', () => {
      const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
      assert.deepEqual(pinProgress(a, 100 + STILL, PIN, STILL), { kind: 'freeze', fraction: 0 });
      assert.deepEqual(pinProgress(a, 100 + STILL + PIN / 2, PIN, STILL), { kind: 'freeze', fraction: 0.5 });
    });

    it('reports a full circle while frozen', () => {
      const frozen = freeze(createState(commands));
      assert.deepEqual(pinProgress(frozen, 9999, PIN, STILL), { kind: 'frozen', fraction: 1 });
    });

    it('reports the release countdown fraction', () => {
      const releasing = beginRelease(freeze(createState(commands)), 2000);
      assert.deepEqual(pinProgress(releasing, 2000 + PIN / 2, PIN, STILL), { kind: 'release', fraction: 0.5 });
    });

    it('clamps fractions to [0, 1]', () => {
      const a = enterCommand(createState(commands), 0, 0, commands[0].subcommands, 100);
      assert.equal(pinProgress(a, 99999, PIN, STILL).fraction, 1);
    });
  });
});
