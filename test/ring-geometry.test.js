'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  ringLevelForDistance,
  ringRadii,
  commandIndexAtAngle,
  commandIndexAtAngleInSegment,
  computeRingLayouts,
  subcommandsAtPath
} = require('../src/ring-geometry');

const closeTo = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${actual} to be close to ${expected}`);

const cmds = n => new Array(n).fill(null).map((_, i) => ({ content: String(i) }));

describe('nested cxtmenu ring geometry', () => {
  describe('ringLevelForDistance', () => {
    it('maps distances inside the root radius to level 0', () => {
      assert.equal(ringLevelForDistance(50, 100, 80), 0);
      assert.equal(ringLevelForDistance(100, 100, 80), 0);
    });

    it('maps the first outer band to level 1', () => {
      assert.equal(ringLevelForDistance(101, 100, 80), 1);
      assert.equal(ringLevelForDistance(180, 100, 80), 1);
    });

    it('maps deeper bands outward', () => {
      assert.equal(ringLevelForDistance(181, 100, 80), 2);
      assert.equal(ringLevelForDistance(260, 100, 80), 2);
    });
  });

  describe('ringRadii', () => {
    it('gives the root ring the full inner disc', () => {
      assert.deepEqual(ringRadii(0, 100, 80), { inner: 0, outer: 100 });
    });

    it('stacks outer rings in fixed-width bands', () => {
      assert.deepEqual(ringRadii(1, 100, 80), { inner: 100, outer: 180 });
      assert.deepEqual(ringRadii(2, 100, 80), { inner: 180, outer: 260 });
    });
  });

  describe('commandIndexAtAngle', () => {
    it('starts the first command at the top-left quadrant boundary', () => {
      assert.equal(commandIndexAtAngle(Math.PI / 2 + 0.1, 4), 0);
    });

    it('walks command sectors as theta increases', () => {
      assert.equal(commandIndexAtAngle(Math.PI + 0.1, 4), 1);
      assert.equal(commandIndexAtAngle(3 * Math.PI / 2 + 0.1, 4), 2);
    });

    it('wraps angles below the start boundary into the last sector', () => {
      assert.equal(commandIndexAtAngle(0.1, 4), 3);
    });

    it('handles a full-circle single command', () => {
      assert.equal(commandIndexAtAngle(1.0, 1), 0);
      assert.equal(commandIndexAtAngle(5.0, 1), 0);
    });
  });

  describe('computeRingLayouts', () => {
    it('lays out the root as a full ring starting at the top', () => {
      const layouts = computeRingLayouts([ { commands: cmds(4), sourcePath: [] } ], 6);
      assert.equal(layouts.length, 1);
      assert.equal(layouts[0].full, true);
      assert.equal(layouts[0].count, 4);
      closeTo(layouts[0].start, Math.PI / 2);
      closeTo(layouts[0].dtheta, Math.PI / 2);
    });

    it('lays out a small submenu as a segment centered on its owner command', () => {
      const layouts = computeRingLayouts([
        { commands: cmds(4), sourcePath: [] },
        { commands: cmds(2), sourcePath: [ 0 ] }
      ], 6);
      // owner mid = PI/2 + 0.5 * PI/2 = 3PI/4; dtheta = 2PI/6 = PI/3;
      // start = 3PI/4 - 2 * PI/3 / 2 = 5PI/12
      assert.equal(layouts[1].full, false);
      assert.equal(layouts[1].count, 2);
      closeTo(layouts[1].dtheta, Math.PI / 3);
      closeTo(layouts[1].start, 5 * Math.PI / 12);
    });

    it('centers a nested segment on its owner command inside the parent segment', () => {
      const layouts = computeRingLayouts([
        { commands: cmds(4), sourcePath: [] },
        { commands: cmds(2), sourcePath: [ 0 ] },
        { commands: cmds(1), sourcePath: [ 0, 0 ] }
      ], 6);
      // owner mid = 5PI/12 + 0.5 * PI/3 = 7PI/12; start = 7PI/12 - PI/6 = 5PI/12
      assert.equal(layouts[2].full, false);
      closeTo(layouts[2].start, 5 * Math.PI / 12);
      closeTo(layouts[2].dtheta, Math.PI / 3);
    });

    it('lays out submenus at or above the threshold as full rings', () => {
      const layouts = computeRingLayouts([
        { commands: cmds(4), sourcePath: [] },
        { commands: cmds(6), sourcePath: [ 0 ] }
      ], 6);
      assert.equal(layouts[1].full, true);
      closeTo(layouts[1].start, Math.PI / 2);
      closeTo(layouts[1].dtheta, Math.PI / 3);
    });

    it('uses full rings for all submenus when the threshold is 0', () => {
      const layouts = computeRingLayouts([
        { commands: cmds(4), sourcePath: [] },
        { commands: cmds(2), sourcePath: [ 0 ] }
      ], 0);
      assert.equal(layouts[1].full, true);
      closeTo(layouts[1].dtheta, Math.PI);
    });
  });

  describe('commandIndexAtAngleInSegment', () => {
    const start = 5 * Math.PI / 12;
    const dtheta = Math.PI / 3;

    it('hits the first sector of a segment', () => {
      assert.equal(commandIndexAtAngleInSegment(start + 0.1, start, dtheta, 2), 0);
    });

    it('hits the last sector of a segment', () => {
      assert.equal(commandIndexAtAngleInSegment(start + dtheta + 0.1, start, dtheta, 2), 1);
    });

    it('answers null outside the segment', () => {
      assert.equal(commandIndexAtAngleInSegment(start + 2 * dtheta + 0.1, start, dtheta, 2), null);
    });

    it('wraps angles across the 0/2PI boundary', () => {
      assert.equal(commandIndexAtAngleInSegment(2 * Math.PI - Math.PI / 12, -Math.PI / 6, dtheta, 2), 0);
    });

    it('covers a full circle when count * dtheta spans 2PI', () => {
      assert.equal(commandIndexAtAngleInSegment(0.1, Math.PI / 2, Math.PI / 2, 4), 3);
    });
  });

  describe('subcommandsAtPath', () => {
    const commands = [
      {
        content: 'A',
        subcommands: [
          { content: 'A1', subcommands: [ { content: 'A1a' } ] }
        ]
      },
      { content: 'B' }
    ];

    it('resolves a first-level path', () => {
      assert.equal(subcommandsAtPath(commands, [ 0 ]), commands[0].subcommands);
    });

    it('resolves a nested path', () => {
      assert.equal(
        subcommandsAtPath(commands, [ 0, 0 ]),
        commands[0].subcommands[0].subcommands
      );
    });

    it('answers null for a command without a submenu', () => {
      assert.equal(subcommandsAtPath(commands, [ 1 ]), null);
    });

    it('answers null for an out-of-range path', () => {
      assert.equal(subcommandsAtPath(commands, [ 5 ]), null);
    });
  });
});
