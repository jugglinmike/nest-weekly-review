'use strict';
var http = require('http');
var url = require('url');

var pathToRegExp = require('path-to-regexp');
var Promise = require('bluebird');
var handlers = [];

function handle(req, res) {
  var pathName = url.parse(req.url).pathname;

  handlers.filter(function(handler) {
    return handler.method === req.method && handler.pattern.test(pathName);
  }).reduce(function(prev, handler) {
    return prev.then(function() {
        console.log('going');
        var next, finish;
        var whenNext = new Promise(function(resolve, reject) {
          next = resolve;
          finish = reject;
        });

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

  //return handler.promise;
}

exports._bind = function(options) {
  var METHOD = options.method.toUpperCase();
  var handler;

  handler = {
    once: options.once,
    method: options.method,
    pattern: pathToRegExp(options.route),
    handler: options.handler
  };

  handlers.push(handler);

  handler.promise = new Promise(function(resolve, reject) {
    handler.resolve = resolve;
    handler.reject = reject;
  });

  return handler.promise;
};

exports.on = function(method, route, handler) {
  exports._bind({
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

if (require.main === module) {
  var req = new http.IncomingMessage();
  var res = new http.ServerResponse({ req: res });
  req.method = 'GET';
  req.url = 'http://bocoup.com';

  exports.once('GET', /.*/, function(req, res, next) {
    console.log('yo! 1');
    res.end();
  });

  exports.once('GET', /.*/, function(req, res, next) {
    console.log('yo! 2');
  });

  handle(req, res);
}
