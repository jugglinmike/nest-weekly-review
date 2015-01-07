/**
 * WARNING: This module alters the behavior of Node.js network APIs through its
 *          use of the `replay` module. Do not require it from any process that
 *          expects direct network access.
 */
'use strict';
var http = require('http');
var url = require('url');

var Promise = require('bluebird');
/**
 * The `replay` module will intercept requests to external URLs and substitute
 * cached responses.
 * https://github.com/assaf/node-replay
 */
var replay = require('replay');
var httpProxy = require('http-proxy');
var EventEmitter = require('events').EventEmitter;

var readMethodsPattern = /GET|OPTIONS|HEAD/;
replay.fixtures = __dirname + '/../fixtures';

EventEmitter.call(exports);
exports.on = EventEmitter.prototype.on;
var emit = EventEmitter.prototype.emit.bind(exports);
var listeners = EventEmitter.prototype.listeners.bind(exports);

exports.removeAllListeners = EventEmitter.prototype.removeAllListeners;

var proxy = httpProxy.createProxyServer({});
var server = http.createServer(function(req, res) {
  var parts = url.parse(req.url);

  if (!readMethodsPattern.test(req.method)) {
    if (listeners(req.method).length === 0) {
      throw new Error('Unhandled ' + req.method + ' request: ' + req.url);
    }
    emit(req.method, req, res);
    return;
  }

  delete parts.path;
  delete parts.pathname;
  delete parts.search;
  delete parts.query;

  // TODO: Remove this when underlying issue is resolved in http-proxy module
  // https://github.com/nodejitsu/node-http-proxy/pull/742
  if (req.method === 'OPTIONS' && !req.headers['content-length']) {
    req.headers['content-length'] = '0';
  }

  proxy.web(req, res, { target: url.format(parts) });
});

exports.listen = function(port) {
  return new Promise(function(resolve, reject) {
    server.listen(port, '127.0.0.1', function(err) {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
};

if (require.main === module) {
  var port = process.env.NODE_PORT || 4023;

  exports.listen(port).then(function() {
    console.log('server listening on port ' + port);
  });
}