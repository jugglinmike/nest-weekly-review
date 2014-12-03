/*'use strict';
var Landing = require('./components/landing/index');

new Landing({
  el: document.body
});
*/
require.config({
  paths: {
    node_modules: '/node_modules'
  }
});
define(function(require) {
  'use strict';
  var State = require('node_modules/ampersand-state/ampersand-state');

  console.log(State);
});
