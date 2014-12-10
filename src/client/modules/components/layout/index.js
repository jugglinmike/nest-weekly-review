define(function(require, exports, module) {
'use strict';
var Ractive = require('node_modules/ractive/ractive.runtime');
var PhaseList = require('../phase-list/index');
var Review = require('../review/index');

module.exports = Ractive.extend({
  template: require('ractive!./template.html'),
  components: {
    'bp-phase-list': PhaseList,
    'bp-review': Review
  }
});
});
