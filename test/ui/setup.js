'use strict';

var Promise = require('bluebird');
var Server = require('leadfoot/Server');
var Command = require('leadfoot/Command');
var chai = require('chai');

var Driver = require('./driver');
var startSelenium = require('./util/start-selenium');
var startApplication = require('./util/start-application');
var apiSpy = require('./util/api-spy');
var seleniumPort = 4444;
var applicationPort = 8003;
var apiUrl = 'http://api.loc';
var proxyPort = 4023;
var quitSelenium, quitApplication, command;

global.assert = chai.assert;
chai.use(require('chai-datetime'));

before(function() {
  this.timeout(10 * 1000);
  apiSpy.allow('ocsp.digicert.com');

  return apiSpy.listen(proxyPort)
    .then(function() {
      return startApplication(applicationPort, apiUrl);
    }).then(function(quit) {
      quitApplication = quit;
      return startSelenium(seleniumPort);
    }).then(function(quit) {
      quitSelenium = quit;
    });
});

beforeEach(function() {
  var server, capabilities;

  this.timeout(10 * 1000);

  server = new Server('http://localhost:' + seleniumPort + '/wd/hub');
  capabilities = {
    browserName: 'firefox',
    proxy: {
      proxyType: 'manual',
      httpProxy: 'localhost:' + proxyPort
    }
  };

  return server.createSession(capabilities).then(function(session) {
    command = new Command(session);

    this.driver = new Driver({
      command: command,
      root: 'http://localhost:' + applicationPort
    });
  }.bind(this));
});

afterEach(function() {
  if (command) {
    return command.quit();
  }
});

after(function() {
  return Promise.resolve()
    .then(function() {
      if (quitSelenium) {
        return quitSelenium();
      }
    }).then(function() {
      if (quitApplication) {
        return quitApplication();
      }
    }).then(function() {
      return apiSpy.close();
    });
});
