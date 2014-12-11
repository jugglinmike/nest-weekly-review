'use strict';
var Ractive = require('ractive');

var r = new Ractive({
  template: '{{#each employees}}<x-employee />{{/each}}',
  el: document.body,
  components: {
    'x-employee': Ractive.extend({
      template:
        //'{{utilizations}}' +
        '{{ut}}',
      computed: {
        ut: function() {
          // Somehow, accessing the `utilizations` property causes Ractive to
          // re-compute this value. If the `utilizations` property is first
          // referenced in the template itself, this recomputation does not
          // take place.
          //debugger;
          var utilizations = this.get('utilizations');
          window.console.log('computed property', utilizations);
        }
      }
    })
  }
});

r.set({ employees: [{ utilizations: [1, 2, 3] }] });
