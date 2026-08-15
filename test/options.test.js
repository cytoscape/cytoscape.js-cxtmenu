'use strict';

const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const { resolveOptions } = require('../src/options');
const defaults = require('../src/defaults');

describe('cxtmenu option resolution', () => {
  it('exposes submenu options under submenuDefaults', () => {
    assert.equal(typeof defaults.submenuDefaults, 'object');
    assert.ok('pinDelay' in defaults.submenuDefaults);
    assert.ok('stillDelay' in defaults.submenuDefaults);
    assert.ok('ringWidth' in defaults.submenuDefaults);
    assert.ok('segmentThreshold' in defaults.submenuDefaults);
    assert.ok('pinning' in defaults.submenuDefaults);
    assert.ok(!('submenuPinDelay' in defaults));
    assert.ok(!('submenuRingWidth' in defaults));
    assert.ok(!('submenuSegmentThreshold' in defaults));
  });

  it('keeps default submenuDefaults when params omit them', () => {
    const options = resolveOptions(defaults, { selector: 'edge' });
    assert.deepEqual(options.submenuDefaults, defaults.submenuDefaults);
    assert.equal(options.selector, 'edge');
  });

  it('merges partial submenuDefaults with the defaults', () => {
    const options = resolveOptions(defaults, { submenuDefaults: { ringWidth: 42, pinning: true } });
    assert.equal(options.submenuDefaults.ringWidth, 42);
    assert.equal(options.submenuDefaults.pinning, true);
    assert.equal(options.submenuDefaults.pinDelay, defaults.submenuDefaults.pinDelay);
    assert.equal(options.submenuDefaults.segmentThreshold, defaults.submenuDefaults.segmentThreshold);
  });

  it('does not mutate the defaults object', () => {
    const before = JSON.parse(JSON.stringify(defaults.submenuDefaults));
    resolveOptions(defaults, { submenuDefaults: { pinDelay: 1 } });
    assert.deepEqual(defaults.submenuDefaults, before);
  });
});
