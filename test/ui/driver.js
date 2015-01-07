'use strict';

var selectors = require('./selectors.json');
var lookup = require('./util/lookup');
var dayNames = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

function Driver(options) {
  this._cmd = options.command;
  this._root = options.root;
}

module.exports = Driver;

Driver.prototype._$ = function(region) {
  var selector = lookup(region, selectors);
  return this._cmd.findAllByCssSelector(selector);
};

Driver.prototype._selectOption = function(element, value) {
  var optionEls;
  return element.findAllByTagName('option')
    .then(function(options) {
      optionEls = options;
      return require('bluebird').all(options.map(function(o) { return o.getVisibleText(); }));
    })
    .then(function(text) {
      var index = text.indexOf(value);

      return this._cmd.execute(function(el) {
        el.selected = true;
      }, [optionEls[index]]);
    }.bind(this));
};

Driver.prototype.read = function(region) {
  return this._$(region).getVisibleText();
};

Driver.prototype.get = function(path) {
  var navigate = function() {
    return this._cmd.get(this._root + path);
  }.bind(this);

  return navigate()
    .then(function() {
      return this._$('session.loginButton');
    }.bind(this))
    .then(function(loginBtn) {
      return loginBtn[0].click()
        .then(navigate);
    }.bind(this), function() {
      // If the login button is not present, the current session is already
      // authenticated and the operation is complete.
    });
};

Driver.prototype.viewWeek = function(phaseNumber, weekNumber) {
  return this._$('index.phaseWeekLink')
    .then(function(weekLinks) {
      return weekLinks[phaseNumber * 5 + weekNumber].click();
    });
};

Driver.prototype.editUtilization = function(employeeNumber, dayName) {
  var dayNumber = dayNames.indexOf(dayName);
  var offset;

  if (!dayNumber) {
    throw new Error('Unrecognized day: "' + dayName + '".');
  }

  offset = employeeNumber * 5 + dayNumber;

  return this._$('phaseWeek.day')
    .then(function(days) {
      return days[offset].click();
    })
    .then(function() {
      return this._$('phaseWeek.typeInput');
    }.bind(this)).then(function(typeInputs) {
      return this._selectOption(typeInputs[offset], 'Sick Time');
    }.bind(this))
    .then(function() {
      return this._$('phaseWeek.set');
    }.bind(this))
    .then(function(set) {
      return set[offset].click();
    })
    .then(function() {
      return require('bluebird').delay(2000);
    });
};
