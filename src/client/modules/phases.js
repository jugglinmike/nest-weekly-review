define(function(require, exports, module) {
'use strict';
var Collection = require('node_modules/ampersand-rest-collection/ampersand-rest-collection');

module.exports = Collection.extend({
  model: require('./phase'),
  url: '/api/phases'
});
});
