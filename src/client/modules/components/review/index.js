define(function(require, exports, module) {
'use strict';
var Ractive = require('node_modules/ractive/ractive.runtime');

var WEEK_MS = 1000 * 60 * 60 * 24 * 7;

module.exports = Ractive.extend({
  template: require('ractive!./template.html'),
  css: require('text!./style.css'),
  components: {
    'bp-employee-row': require('../review-employee-row/index')
  },
  computed: {
    date: function() {
      var start = this.get('phase.date_start');
      var weekOffset = this.get('weekOffset');

      if (!start || weekOffset === undefined) {
        return start;
      }

      return new Date(start.getTime() + WEEK_MS * weekOffset);
    }
  }
});
});
