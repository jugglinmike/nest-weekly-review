'use strict';
var url = require('url');

var debug = require('debug')('main');
var express = require('express');
var browserifyMiddleware = require('browserify-middleware');
var browserify = require('browserify-middleware/node_modules/browserify');

var app = express();

// Do not Browserify RequireJS
app.use('/node_modules/requirejs', express.static(__dirname + '/../../node_modules/requirejs'));

// Create the browserifyMiddleware for all npm modules
var middleWare = browserifyMiddleware(__dirname + '/../../node_modules', {
  // The `standalone` option wraps browserified code in UMD. Since the target
  // environment implements AMD (and since the UMD code uses an anonymous form
  // for AMD), the value does not matter.
  standalone: 'foo'
});

var cache = {};
app.use('/node_modules', function(req, res) {
  if (req.url in cache) {
    res.send(cache[req.url]);
    res.end();
    return;
  }

  var write = res.write;
  var src = '';
  res.write = function(data) {
    src += data;
    write.apply(this, arguments);
  };

  res.addListener('finish', function() {
    cache[req.url] = src;
  });
  middleWare.apply(this, arguments);
});

app.use('/api', require('./api/router'));

// Re-write directory requests to the project root. The client-side code served
// from the index is capable of rendering the correct page based on the initial
// URL. This enables direct access (via external link) to specific application
// pages.
app.use(function(req, res, next) {
  var parts;
  if (/\/$/.test(req.path)) {
    parts = url.parse(req.url);
    parts.pathname = '/';
    req.url = url.format(parts);
  }
  next();
});

app.use(express.static(__dirname + '/../client'));

var server = app.listen(8000, function() {
  debug('Server listening on port ' + server.address().port);
});
