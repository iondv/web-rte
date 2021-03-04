#!/usr/bin/env node
/* eslint no-process-exit:off, no-sync:off */
'use strict';
const { server } = require('@iondv/web');
const { log: { IonLogger } } = require('@iondv/commons');

const path = require('path');
const fs = require('fs');

let config_file = process.argv[2] || process.env.ION_CONFIG_PATH || 'config.js';

config_file = path.isAbsolute(config_file)
  ? config_file
  : path.normalize(path.join(process.cwd(), config_file));

const { onStart, dispatcher, modules, ...config } = fs.existsSync(config_file) ? require(config_file) : {};

const sysLog = new IonLogger(config.log || {});

server({
  config,
  sysLog,
  onStart,
  dispatcher,
  modules
});
