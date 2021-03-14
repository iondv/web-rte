#!/usr/bin/env node

const path = require('path');
const copydir = require('copy-dir');
const { exec } = require('child_process');

if (process.cwd() !== __dirname) {
  console.log('installing web ui default theme');
  copydir(path.join(__dirname, 'view'), path.join(process.cwd(), 'view/platform'), { cover: true }, (err) => {
    if (err) {
      console.error(err);
    }
    const inst = exec(`npm install`, { cwd: `${process.cwd}/view/platform/default/static` });
    inst.on('close', () => {
      process.exit(0);
    });
  });
}
