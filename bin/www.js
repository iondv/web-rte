#!/usr/bin/env node
/* eslint no-process-exit:off, no-sync:off */
'use strict';
const config_file = arguments[2] || process.env.ION_CONFIG_PATH;

const { onStart, ...config } = require(path.isAbsolute(config_file) ? config_file : path.normalize(path.join(__dirname, config_file)));
const { log: { IonLogger } } = require('@iondv/commons');
const { t } = require('@iondv/i18n');
const { server } = require('@iondv/web');

const dispatcher = require('../dispatcher');
const modules = require(path.join(process.cwd(), 'modules'));

const sysLog = new IonLogger(config.log || {});

server({
  config,
  sysLog,
  onStart,
  dispatcher: (app) => {
    app.get('/api/notifications', dispatcher.api.notifications);
    app.post('/api/notifications/viewed/:id', dispatcher.api.markAsViewed);
    app.post('/api/notifications/viewed-all', dispatcher.api.markAllAsViewed);
    app.get('/api/notifications/viewed-more/:offset', dispatcher.api.moreViewedNotifications);
    app.get('/i18n/handler.js', dispatcher.api.i18n);
  },
  modules,
  baseDir: path.normalize(path.join(__dirname, '..'))  
});
