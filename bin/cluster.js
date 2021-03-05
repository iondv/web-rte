#!/usr/bin/env node
/* eslint no-process-env: off, no-process-exit:off */
const cluster = require('cluster');
const path = require('path');
const i18n = require('@iondv/i18n');
const { log: { IonLogger } } = require('@iondv/commons');

const sysLog = new IonLogger(config.log || {});
const { format } = require('util');
const { t, lang } = i18n;

let config_file = process.argv[2] || process.env.ION_CONFIG_PATH || 'config';
config_file = path.isAbsolute(config_file)
  ? config_file
  : path.normalize(path.join(process.cwd(), config_file));

const { onStart, dispatcher, modules, ...config } = fs.existsSync(config_file) ? require(config_file) : {};

const LANG = config.lang || process.env.ION_LANG || 'en';

lang(LANG);

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

  let p = i18n.load(path.normalize(path.join(process.cwd(), 'i18n')), null, LANG)
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
    p = p.then(onStart);
  }
  p.catch((err) => console.error(err));
} else {
  const { server } = require('@iondv/web');
  server({
    config,
    sysLog,
    dispatcher,
    modules
  });
}
