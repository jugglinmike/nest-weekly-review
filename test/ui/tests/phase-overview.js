'use strict';

var ONE_DAY = 1000 * 60 * 60 * 24;
var Promise = require('bluebird');
var apiSpy = require('../util/api-spy');

describe('phase overview', function() {
  var datePattern = /(\d+)\s*\/\s*(\d+)/;
  var driver;

  before(function() {
    apiSpy.on('OPTIONS', /.*/, function(req, res) { res.end(); });
  });

  beforeEach(function() {
    driver = this.driver;
  });

  describe('index page', function() {
    beforeEach(function() {
      this.timeout(9000);
      function handlePhaseRequest(req, res) {
        var today = new Date();
        var prevSunday = new Date(
          today.getTime() - 1000 * 60 * 60 * 24 * today.getDay()
        );
        var fiveWeeks = new Date(
          prevSunday.getTime() + 1000 * 60 * 60 * 24 * 7 * 5
        );
        assert.equal(req.query.after, prevSunday.toISOString().replace(/T.*/, ''));
        assert.equal(req.query.before, fiveWeeks.toISOString().replace(/T.*/, ''));
        res.end(
          JSON.stringify({ linked: { employees: [] }, project_phases: [] })
        );
      }
      return Promise.all([
        apiSpy.once('GET', '/project-phases', handlePhaseRequest),
        apiSpy.once('GET', '/project-phases', handlePhaseRequest),
        driver.get('/')
      ]);
    });

    it('renders the application title', function() {
      return driver.read('index.title')
        .then(function(text) {
          assert.equal(text, 'Black Phoenix');
        });
    });

    it('simba', function() {
      function handlePost(req, res) {
        assert.equal(req.body.employee_id, 22);
        assert.equal(req.body.utilization_type_id, 1);
        res.end();
      }

      return driver.viewWeek(0, 3)
        .then(function() {
          return Promise.all([
            apiSpy.once('POST', '/utilizations', handlePost),
            apiSpy.once('POST', '/utilizations', handlePost),
            driver.editUtilization(0, 'tuesday')
          ]);
        });
    });

    it('displays the current week according to the current system time', function() {
      var now = new Date();
      var lastSunday = new Date(now.getTime() - now.getDay() * ONE_DAY);

      return driver.read('index.weekLabels')
        .then(function(labels) {
          var match = datePattern.exec(labels[0]);

          assert(match, 'Has a date string in the expected location');
          assert.equal(match[1], lastSunday.getMonth() + 1, 'correct month');
          assert.equal(match[2], lastSunday.getDate(), 'correct day');
        });
    });
  });

  describe('specific phase', function() {
    beforeEach(function() {
      this.timeout(9000);
      return driver.get('/year/2014/week/50/');
    });

    it('displays the correct weeks for a given URL', function() {
      return driver.read('index.weekLabels')
        .then(function(labels) {
          var match;

          match = datePattern.exec(labels[0]);
          assert(match, 'Has a date string in the expected location');
          assert.equal(match[1], 12);
          assert.equal(match[2], 21);

          match = datePattern.exec(labels[1]);
          assert(match, 'Has a date string in the expected location');
          assert.equal(match[1], 12);
          assert.equal(match[2], 28);

          match = datePattern.exec(labels[2]);
          assert(match, 'Has a date string in the expected location');
          assert.equal(match[1], 1);
          assert.equal(match[2], 4);

          match = datePattern.exec(labels[3]);
          assert(match, 'Has a date string in the expected location');
          assert.equal(match[1], 1);
          assert.equal(match[2], 11);

          match = datePattern.exec(labels[4]);
          assert(match, 'Has a date string in the expected location');
          assert.equal(match[1], 1);
          assert.equal(match[2], 18);
        });
    });
  });
});
