'use strict';

var Promise = require('bluebird');
var spawn = require('child_process').spawn;

var portGuard = require('./port-guard');
var jarFile = require('selenium-binaries').seleniumserver;

module.exports = function(port) {
  return portGuard(port, function() {
      var child = spawn('java', [
        '-jar', jarFile,
        '-port', port
      ]);
      var kill = function() {
        child.kill();

        return new Promise(function(resolve, reject) {
          child.once('exit', resolve);
          child.once('error', reject);
        });
      };

      return kill;
    });
};
