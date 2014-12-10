define(function(require, exports, module) {
'use strict';
var Ractive = require('node_modules/ractive/ractive.runtime');

module.exports = Ractive.extend({
  template: require('ractive!./template.html')
});
});
