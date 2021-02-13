/**
 * Created by kras on 06.02.18.
 */
'use strict';

const { backend: { onError, respond } } = require('@iondv/web');

// jshint maxstatements: 40, maxcomplexity: 20, maxdepth: 20, loopfunc: true

module.exports = function (req, res) {
  respond(['auth', 'notifier'],
    /**
     * @param {{notifier: Notifier, auth: Auth}} scope
     * @param {AccessChecker} scope.accessChecker
     */
    function (scope) {
      try {
        let user = scope.auth.getUser(req);
        scope.notifier.markAllAsRead(user.id())
          .then(() => {
            res.send('Done');
          })
          .catch((err) => {
            onError(scope, err, res, true);
          });
      } catch (err) {
        scope.logRecorder.stop();
        onError(scope, err, res, true);
      }
    },
    res
  );
};