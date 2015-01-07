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
  return apiSpy.listen(proxyPort);
});

beforeEach(function() {
  var testCtx = this;

  this.timeout(10 * 1000);

  return startSelenium(seleniumPort).then(function(quit) {
    quitSelenium = quit;
    return startApplication(applicationPort, apiUrl);
  }).then(function(quit) {
    var server, capabilities;

    quitApplication = quit;

    server = new Server('http://localhost:' + seleniumPort + '/wd/hub');
    capabilities = {
      browserName: 'firefox',
      proxy: {
        proxyType: 'manual',
        httpProxy: 'localhost:' + proxyPort
      }
    };

    return server.createSession(capabilities);
  }).then(function(session) {
    var driver;
    apiSpy.on('POST', function(req, res) {
      console.log('POST!', req.url);
      res.end();
      apiSpy.removeAllListeners();
    });

    command = new Command(session);
    driver = testCtx.driver = new Driver({
      command: command,
      root: 'http://localhost:' + applicationPort
    });
  });
});

afterEach(function() {
  return Promise.resolve()
    .then(function() {
      if (command) {
        return command.quit();
      }
    }).then(function() {
      if (quitSelenium) {
        return quitSelenium();
      }
    }).then(function() {
      if (quitApplication) {
        return quitApplication();
      }
    });
});
