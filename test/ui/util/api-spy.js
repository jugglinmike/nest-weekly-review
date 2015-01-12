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

var proxyServer = httpProxy.createProxyServer({});
var jsonMimePattern = /application\/json/;
var reqHandlers = {
  POST: [], PUT: [], PATCH: [], DELETE: [], OPTIONS: [], GET: []
};
var fixtureDir = __dirname + '/../fixtures';

replay.fixtures = fixtureDir;

function parseRequest(req) {
  var body = '';

  req.on('data', function(chunk) {
    body += chunk;
  });

  return new Promise(function(resolve, reject) {
    req.on('end', function() {
      var parts = url.parse(req.url, true);
      req.body = body;
      req.host = parts.host;
      req.hostname = parts.hostname;
      req.port = parts.port;
      req.protocol = parts.protocol;
      req.query = parts.query;

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

function prepResponse(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Headers', 'authorization');
    res.setHeader(
      'Access-Control-Allow-Methods', 'GET,HEAD,PUT,PATCH,POST,DELETE'
    );
    res.setHeader('Access-Control-Allow-Origin', '*');
  }

  res.setHeader('Vary', 'Origin');
}

function handle(req, res) {
  var handlers = reqHandlers[req.method];
  var pathName = url.parse(req.url).pathname;

  return handlers.reduce(function(prev, handler) {
    if (!handler.pattern.test(pathName)) {
      return prev;
    }

    return prev.then(function() {
        return parseRequest(req);
      }).then(function() {
        var next, finish;
        var whenNext = new Promise(function(resolve, reject) {
          next = resolve;
          finish = reject;
        });

        prepResponse(req, res);

        res.on('finish', finish);
        if (handler.once) {
          handlers.splice(handlers.indexOf(handler), 1);
        }

        try {
          handler.handler.call(null, req, res, next);
        } catch (err) {
          handler.reject(err);
        }

        return whenNext;
      }, handler.reject);
  }, Promise.resolve());
}

var proxy = function(req, res) {
  var parts = url.parse(req.url);

  delete parts.path;
  delete parts.pathname;
  delete parts.search;
  delete parts.query;

  // TODO: Remove this when underlying issue is resolved in http-proxy module
  // https://github.com/nodejitsu/node-http-proxy/pull/742
  if (req.method === 'OPTIONS' && !req.headers['content-length']) {
    req.headers['content-length'] = '0';
  }

  proxyServer.web(req, res, { target: url.format(parts) });
};

var server = http.createServer(function(req, res) {
  handle(req, res).then(function() {
      proxy(req, res);
    }, function() {
      console.log('not okay');
    });
});

exports.allow = function(host) {
  replay.allow(host);
};

exports._bind = function(options) {
  var METHOD = options.method.toUpperCase();
  var handler;

  if (!reqHandlers.hasOwnProperty(METHOD)) {
    throw new Error('Unrecognized request method: "' + options.method + '".');
  }

  handler = {
    once: options.once,
    pattern: pathToRegExp(options.route),
    handler: options.handler
  };

  reqHandlers[METHOD].push(handler);

  handler.promise = new Promise(function(resolve, reject) {
    handler.resolve = resolve;
    handler.reject = reject;
  });

  return handler.promise;
};

exports.on = function(method, route, handler) {
  return exports._bind({
    method: method,
    route: route,
    handler: handler
  });
};

exports.once = function(method, route, handler) {
  return exports._bind({
    once: true,
    method: method,
    route: route,
    handler: handler
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
