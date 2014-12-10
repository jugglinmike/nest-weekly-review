define(function(require, exports, module) {
'use strict';
var Ractive = require('node_modules/ractive/ractive.runtime');

var weekNumber = require('../../util/week-num');

module.exports = Ractive.extend({
  template: require('ractive!./template.html'),
  css: require('text!./style.css'),
  reviewUrl: function(offset) {
    return '/phase/' + this.get('id') + '/week/' + offset +'/';
  },
  computed: {
    weeks: function() {
      var viewWidth = this.get('data-num-weeks');
      var viewStart = this.get('data-first-week');
      var phaseStart = this.get('date_start');
      var between = Math.round(weekNumber.between(phaseStart, viewStart));
      var phaseLength = this.get('calendar_weeks');
      var weeks = [];
      var weekOffset, idx;

      for (idx = 0; idx < viewWidth; ++idx) {
        weekOffset = between + idx;
        weeks.push({
          isActive: weekOffset >= 0 && weekOffset < phaseLength,
          reviewUrl: this.reviewUrl(weekOffset)
        });
      }

      return weeks;
    }
  }
});
});
