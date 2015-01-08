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
var pathToRegExp = require('path-to-regexp');

var proxy = httpProxy.createProxyServer({});
var readMethodsPattern = /GET|OPTIONS|HEAD/;
var jsonMimePattern = /application\/json/;
var reqHandlers = { POST: [], PUT: [], PATCH: [], DELETE: [] };
var fixtureDir = __dirname + '/../fixtures';

replay.fixtures = fixtureDir;

function parseRequest(req) {
  var body = '';

  req.on('data', function(chunk) {
    body += chunk;
  });

  return new Promise(function(resolve, reject) {
    req.on('end', function() {
      req.body = body;

      if (jsonMimePattern.test(req.headers['content-type'])) {
        try {
          req.body = JSON.parse(req.body);
        } catch (err) {
          reject(new Error('Request contains malformed body: ' + err));
          return;
        }
      }

      resolve();
    });
  });
}

function trigger(req, res) {
  var handlers = reqHandlers[req.method];
  var path = url.parse(req.url).path;

  var found = handlers.some(function(handler, idx) {
    if (!handler.pattern.test(path)) {
      return false;
    }

    parseRequest(req).then(function() {
      res.on('finish', handler.resolve);
      handlers.splice(idx, 1);
      handler.handler.call(null, req, res);
    }, handler.reject);

    return true;
  });

  if (!found) {
    throw new Error('Unhandled request: ' + req.method + ' ' + req.url);
  }
}

var server = http.createServer(function(req, res) {
  var parts = url.parse(req.url);

  if (!readMethodsPattern.test(req.method)) {
    trigger(req, res);
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

exports.handle = function(method, route, handler) {
  var METHOD = method.toUpperCase();

  if (!reqHandlers.hasOwnProperty(METHOD)) {
    throw new Error('Unrecognized request method: "' + method + '".');
  }
  handler = {
    pattern: pathToRegExp(route),
    handler: handler
  };

  reqHandlers[METHOD].push(handler);

  return new Promise(function(resolve, reject) {
    handler.resolve = resolve;
    handler.reject = reject;
  });
};

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

exports.close = function() {
  return new Promise(server.close.bind(server));
};

if (require.main === module) {
  var port = process.env.NODE_PORT || 4023;

  exports.listen(port).then(function() {
    console.log('api spy listening on port ' + port);
  });
}
