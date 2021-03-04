const merge = require('merge');

module.exports = (config, sysLog) => di(
  'boot',
  merge(
    {
      rtEvents: {
        options: {
          target: 'ion://process',
          stopEvent: 'SIGTERM'
        }
      }
    },
    config.bootstrap
  ),
  { sysLog, process }
)
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