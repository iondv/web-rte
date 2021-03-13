#!/usr/bin/env node

const path = require('path');
const copydir = require('copy-dir');
const { exec } = require('child_process');

copydir(`${__dirname}/view`, `${process.cwd}/view/platform`, { cover: true }, (err) => {
  if (err) {
    console.error(err);
  }
  const inst = exec(`npm install`, { cwd: `${process.cwd}/view/platform/default/static` });
  inst.on('close', () => {
    process.exit(0);
  });
})