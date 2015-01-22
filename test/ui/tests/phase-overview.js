'use strict';

var ONE_DAY = 1000 * 60 * 60 * 24;
var Promise = require('bluebird');

describe('phase overview', function() {
  var datePattern = /(\d+)\s*\/\s*(\d+)/;
  var driver, middleMan;

  before(function() {
    middleMan = this.middleMan;
  });

  beforeEach(function() {
    driver = this.driver;
  });

  describe('index page', function() {
    beforeEach(function() {
      this.timeout(9000);
      function handlePhaseRequest(req, res) {
        var today = new Date();
        var prevSunday = new Date(today.getTime() - ONE_DAY * today.getDay());
        var fiveWeeks = new Date(prevSunday.getTime() + ONE_DAY * 7 * 5);

        assert.equal(
          req.query.after, prevSunday.toISOString().replace(/T.*/, '')
        );
        assert.equal(
          req.query.before, fiveWeeks.toISOString().replace(/T.*/, '')
        );

        res.end(
          JSON.stringify({ linked: { employees: [] }, project_phases: [] })
        );
      }
      return Promise.all([
        middleMan.once('GET', '/project-phases', handlePhaseRequest),
        middleMan.once('GET', '/project-phases', handlePhaseRequest),
        driver.get('/')
      ]);
    });

    it('displays the current week according to the local system time', function() {
      return driver.read('index.title')
        .then(function(text) {
          assert.equal(text, 'Weekly Review', 'Application title visible');
        })
        .then(function() {
          return driver.read('index.weekLabels');
        })
        .then(function(labels) {
          var now = new Date();
          var lastSunday = new Date(now.getTime() - now.getDay() * ONE_DAY);
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
      return driver.get('/date/2014-12-21/');
    });

    it('correctly edits an existing single-day utilization', function() {
      function handleDelete(req, res) {
        var id = parseInt(req.params.id, 10);
        assert.equal(id, 5);
        res.end(JSON.stringify({ id: id }));
      }
      function handlePost(req, res) {
        res.end(JSON.stringify({ id: 6 }));
      }
      function handlePut(req, res) {
        res.end();
      }

      return driver.viewWeek(0, 3)
        .then(function() {
          return Promise.all([
            middleMan.once('DELETE', '/utilizations/:id', handleDelete),
            middleMan.once('POST', '/utilizations', handlePost),
            // TODO: No PUT requests should be issued in this case. Fix the bug
            // and remove this.
            middleMan.once('PUT', '/utilizations/:id', handlePut),
            driver.editUtilization({
              name: 'Jerry Seinfeld',
              day: 'thursday',
              type: 'Education'
            })
          ]);
        });
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
