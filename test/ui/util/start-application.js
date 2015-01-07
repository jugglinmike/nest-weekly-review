'use strict';

var spawnNpmScript = require('./spawn-npm-script');

var pollHttp = require('./poll-http');

module.exports = function(port, apiUrl) {
  var env = {
    BP_API: apiUrl,
    BP_BYPASS_AUTH: '1',
    NODE_PORT: port,
    PATH: process.env.PATH
  };
  var child = spawnNpmScript(
    '../../../package.json', 'start-dev', { env: env }
  );
  var kill = child.kill.bind(child, 'SIGTERM');

  return pollHttp(port).then(function() {
      return kill;
    }, function(err) {
      try {
        kill();
      } catch(err) {}

      throw err;
    });
};
