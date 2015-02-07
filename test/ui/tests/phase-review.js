'use strict';
var Promise = require('bluebird');

describe('phase review', function() {
  var middleMan, driver;

  before(function() {
    middleMan = this.middleMan;
  });

  beforeEach(function() {
    driver = this.driver;

    this.timeout(30 * 1000);

    return driver.get('/date/2014-12-21/');
  });

  describe('review with utilizations that require "trimming"', function() {
    beforeEach(function() {
      return driver.viewWeek(0, 2);
    });

    afterEach(function() {
      DEBUG('afterEach 1');
    });

    it.only('correctly submits a review', function() {
      this.timeout(80 * 1000);
      middleMan.on('PUT', '/utilizations/2', function(req, res) {
          DEBUG('PUT');
          res.end();
        });

      return driver.verify(['Jerry Seinfeld'])
        .then(function() {
          return driver.submitReview();
        });
    });
  });
});

global.DEBUG = (function() {
  var msgs = [];
  return function() {
    msgs.push(Array.prototype.slice.call(arguments));
    console.log(msgs);
  };
}());
