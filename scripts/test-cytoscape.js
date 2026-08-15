'use strict';

const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const requestedVersion = process.argv[2];

const npmCommand =
  process.platform === 'win32'
    ? 'npm.cmd'
    : 'npm';

if(!requestedVersion){
  throw new Error(
    'Usage: node scripts/test-cytoscape.js <cytoscape-version>'
  );
}

execFileSync(
  npmCommand,
  [
    'install',
    '--no-save',
    '--package-lock=false',
    '--ignore-scripts',
    `cytoscape@${requestedVersion}`
  ],
  {
    cwd: root,
    stdio: 'inherit'
  }
);

const cytoscapePackage = path.resolve(
  root,
  'node_modules',
  'cytoscape',
  'package.json'
);

if(!fs.existsSync(cytoscapePackage)){
  throw new Error(
    `Unable to locate Cytoscape package metadata: ${cytoscapePackage}`
  );
}

const installedVersion =
  JSON.parse(
    fs.readFileSync(
      cytoscapePackage,
      'utf8'
    )
  ).version;

if(installedVersion !== requestedVersion){
  throw new Error(
    `Requested Cytoscape ${requestedVersion}, but installed ${installedVersion}`
  );
}

execFileSync(
  npmCommand,
  [
    'test'
  ],
  {
    cwd: root,
    stdio: 'inherit'
  }
);
