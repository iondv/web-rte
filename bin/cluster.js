#!/usr/bin/env node
/* eslint no-process-env: off, no-process-exit:off */
const cluster = require('cluster');
const { log: { IonLogger } } = require('@iondv/commons');
const sysLog = new IonLogger(config.log || {});
const path = require('path');
const i18n = require('@iondv/i18n');
const { format } = require('util');
const dispatcher = require('../dispatcher');
const modules = require(path.join(process.cwd(), 'modules'));

const { t, lang } = i18n;

const config_file = arguments[2] || process.env.ION_CONFIG_PATH;

const { onStart, preLoad, ...config } = require(
  path.isAbsolute(config_file)
  ? config_file
  : path.normalize(path.join(__dirname, config_file))
);

const LANG = config.lang || process.env.ION_LANG || 'en';

lang(LANG);
const { arguments } = require('commander');

function killEmAll() {
  for (const id in cluster.workers) {
    cluster.workers[id].kill();
  }
}

if (cluster.isMaster) {
  const os = require('os');

  const clusterConfig = config.cluster || {};

  const cpus = os.cpus().length;
  let numWorkers = process.env.WORKER_COUNT || clusterConfig.count || cpus;
  if (numWorkers > cpus) {
    numWorkers = cpus;
  }
  let stopping = false;

  if (clusterConfig.master && typeof clusterConfig.master === 'object') {
    cluster.setupMaster(clusterConfig.master);
  }

  cluster.on('exit', (worker) => {
    sysLog.warn(format(t('ION application (pid: %s) stopped.'), worker.process.pid));
    if (!stopping) {
      cluster.fork();
    }
  });

  cluster.on('listening', (worker, address) => {
    sysLog.info(format(
      t('ION application (pid: %s) started on address %s:%s'),
      worker.process.pid, address.address || 'localhost', address.port
    ));
  });

  process.on('SIGHUP', () => {
    sysLog.warn(t('ION application cluster restart'));
    killEmAll();
  });

  process.on('SIGTERM', () => {
    stopping = true;
    killEmAll();
  });

  // i18n.load(path.normalize(path.join(__dirname, '..', 'i18n')), null, LANG)

  let p = (typeof preLoad === 'function' ? preLoad() : Promise.resolve())
    .then(() => {
      sysLog.info(format(t('Starting ION application cluster (pid: %s)'), process.pid));
    });
  for (let i = 1; i < numWorkers; i++) {
    p = p.then(() => {
      let w = cluster.fork();
      return new Promise((resolve, reject) => {
        w.on('listening', resolve);
        w.on('error', err => reject(err));
      });
    });
  }
  if (typeof onStart === 'function') {
    return Promise.resolve().then(() => onStart());
  }
  /*
  if (config.runJobs) {
    config.bootstrap.rtEvents.options = {
      target: 'ion://process',
      stopEvent: 'SIGTERM'
    };
    p.then(() => di('boot', config.bootstrap, {sysLog: sysLog, process: process}))
      .then(scope =>
        di(
          'app',
          di.extract('scheduler', extend(true, config.di, scope.settings.get('plugins') || {})),
          {},
          'boot'
        )
      )
      .then(
        (scope) => {
          sysLog.info(t('Starting scheduler'));
          return scope.scheduler.start().then(() => {
            sysLog.info(t('Scheduler started'));
          });
        }
      )
      .catch(
        (e) => {
          sysLog.error(e);
          killEmAll();
          process.exit(130);
        }
      );
  }
  */
} else {
  const { server } = require('@iondv/web');
  server({
    config,
    sysLog,
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
}
