'use strict';

var debug = require('debug')('main');
var express = require('express');
var browserifyMiddleware = require('browserify-middleware');

var app = express();

/*app.use('/modules/main.js', browserifyMiddleware(__dirname + '/../client/modules/main.js', {
  transform: [
    require('./ractive-transform')
  ]
}));*/
app.use('/node_modules/requirejs', express.static(__dirname + '/../../node_modules/requirejs'));
app.use('/node_modules', browserifyMiddleware(__dirname + '/../../node_modules'));
app.use(express.static(__dirname + '/../client'));

var server = app.listen(8000, function() {
  debug('Server listening on port ' + server.address().port);
});
