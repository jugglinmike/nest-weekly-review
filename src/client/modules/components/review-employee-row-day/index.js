'use strict';
var Component = require('../../util/component');
var hexToRgb = require('../../util/hex-to-rgb');

// TODO: Initially set `newType`, `newPosition` to the associated value for the
// current day.

module.exports = Component.extend({
  template: require('./template.html'),
  css: require('./style.css'),
  computed: {
    style: function() {
      var hex = this.get('utilization.type.color');
      return 'background-color: rgba(' + hexToRgb(hex) + ',0.5);';
    },
    // Define a set-able computed property so the utilizations collection can
    // be updated according to the state of a checkbox input.
    uBool: {
      get: function() {
        return !!this.get('utilization');
      },
      set: function(val) {
        var utilizations = this.get('utilizations');
        var date = new Date(
          this.get('date').getTime() + this.get('daynum')*1000*60*60*24
        );
        var current;

        // Leave the utilization as-is until a new value is selected.
        if (!val) {
          return;
        }

        // TODO: Set this to the current utilization
        current = utilizations.setAtDate(date, {
          utilization_type_id: this.get('newType.id'),
          type: this.get('newType'),
          employee_id: this.get('id'),
          position_id: this.get('newPosition.id'),
          project_id: this.get('phase.project.id')
        }, { silent: true });

        this.set('utilization', current);
      }
    }
  }
});
