define(function(require, exports, module) {
'use strict';
var Router = require('node_modules/ampersand-router/ampersand-router');
var Phases = require('./phases');
var Layout = require('./components/layout/index');
var weekNumber = require('./util/week-num');
require('./ractive-adaptors-backbone');

module.exports = Router.extend({
  initialize: function(options) {
    this.layout = new Layout({
      el: options.el,
      adapt: ['Backbone']
    });
    this.phases = new Phases();

  },

  routes: {
    '': 'index',
    'year/:year/week/:week/': 'phaseList',
    'phase/:phaseId/week/:weekOffset/': 'review'
  },

  index: function() {
    var now = new Date();
    var thisWeek = weekNumber.fromDate(now);

    this.phaseList(now.getFullYear(), thisWeek);
  },

  phaseList: function(year, week) {
    this.layout.set('route', 'phaseList');

    // TODO: Fetch with date range, and only when the range includes dates that
    // have not previously been fetched.
    if (!this.hasFetched) {
      this.phases.fetch();
      this.hasFetched = true;
    }
    this.layout.findComponent('bp-phase-list').set({
      firstWeek: weekNumber.toDate(year, week),
      numWeeks: 5,
      _phases: this.phases
    });
  },

  review: function(phaseId, weekOffset) {
    this.layout.set('route', 'review');
    this.phases.getOrFetch(parseInt(phaseId, 10), function(err, phase) {
      this.layout.findComponent('bp-review').set({
        weekOffset: parseInt(weekOffset, 10),
        phase: phase
      });
    }.bind(this));
  }
});
});
