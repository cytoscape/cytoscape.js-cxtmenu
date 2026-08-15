'use strict';

// Pure geometry helpers for nested cxtmenu rings.
// Level 0 covers the whole inner disc [0, rootRadius];
// level k >= 1 covers the band [rootRadius + (k-1)*ringWidth, rootRadius + k*ringWidth].

function ringLevelForDistance(distance, rootRadius, ringWidth){
  if( distance <= rootRadius ){
    return 0;
  }

  return Math.ceil( (distance - rootRadius) / ringWidth );
}

function ringRadii(level, rootRadius, ringWidth){
  if( level === 0 ){
    return { inner: 0, outer: rootRadius };
  }

  return {
    inner: rootRadius + (level - 1) * ringWidth,
    outer: rootRadius + level * ringWidth
  };
}

// theta is measured like in cxtmenu.js: 0 at +x axis, increasing counter-clockwise,
// with the first command sector starting at PI/2 (top).
function commandIndexAtAngle(theta, commandCount){
  const dtheta = 2 * Math.PI / commandCount;
  const start = Math.PI / 2;
  let normalized = (theta - start) % (2 * Math.PI);

  if( normalized < 0 ){
    normalized += 2 * Math.PI;
  }

  const index = Math.floor(normalized / dtheta);

  return Math.min(index, commandCount - 1);
}

// Compute the angular layout for each visible ring.
// Ring input: { commands, sourcePath }. Output per ring:
// { full, count, start, dtheta } where sectors span
// [start + i*dtheta, start + (i+1)*dtheta] for i in [0, count).
// Submenus with fewer than `segmentThreshold` commands are laid out as a
// segment centered on the owner command; a threshold of 0 disables segments.
function computeRingLayouts(rings, segmentThreshold){
  const layouts = [];

  for( let i = 0; i < rings.length; i++ ){
    const ring = rings[i];
    const count = ring.commands.length;

    if( i === 0 ){
      layouts.push({ full: true, count, start: Math.PI / 2, dtheta: 2 * Math.PI / count });
      continue;
    }

    const isSegment = segmentThreshold > 0 && count < segmentThreshold;

    if( !isSegment ){
      layouts.push({ full: true, count, start: Math.PI / 2, dtheta: 2 * Math.PI / count });
      continue;
    }

    const parentPath = ring.sourcePath.slice(0, -1);
    const ownerIndex = ring.sourcePath[ ring.sourcePath.length - 1 ];
    let ownerRingI = 0;

    for( let j = 0; j < i; j++ ){
      const otherPath = rings[j].sourcePath;
      const samePath = otherPath.length === parentPath.length
        && otherPath.every((v, k) => v === parentPath[k]);

      if( samePath ){
        ownerRingI = j;
        break;
      }
    }

    const owner = layouts[ownerRingI];
    const ownerMid = owner.start + (ownerIndex + 0.5) * owner.dtheta;
    const dtheta = 2 * Math.PI / segmentThreshold;

    layouts.push({
      full: false,
      count,
      start: ownerMid - count * dtheta / 2,
      dtheta
    });
  }

  return layouts;
}

// Like commandIndexAtAngle but for a (possibly partial) segment;
// answers null when theta falls outside the segment's angular span.
function commandIndexAtAngleInSegment(theta, start, dtheta, count){
  let normalized = (theta - start) % (2 * Math.PI);

  if( normalized < 0 ){
    normalized += 2 * Math.PI;
  }

  if( normalized > count * dtheta ){
    return null;
  }

  return Math.min( Math.floor(normalized / dtheta), count - 1 );
}

function subcommandsAtPath(commands, path){
  let current = commands;

  for( let i = 0; i < path.length; i++ ){
    const command = current[ path[i] ];

    if( !command || !Array.isArray(command.subcommands) ){
      return null;
    }

    current = command.subcommands;
  }

  return current;
}

module.exports = {
  ringLevelForDistance,
  ringRadii,
  commandIndexAtAngle,
  commandIndexAtAngleInSegment,
  computeRingLayouts,
  subcommandsAtPath
};
