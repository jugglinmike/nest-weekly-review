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

  describe('review', function() {

    beforeEach(function() {
      return driver.viewWeek(1, 3);
    });

    it('renders as expected', function() {
      return driver.readAll('phaseWeek.dayLabels')
        .then(function(days) {
          assert.deepEqual(
            days,
            [
              'MONDAY (12th)', 'TUESDAY (13th)', 'WEDNESDAY (14th)',
              'THURSDAY (15th)', 'FRIDAY (16th)'
            ]
          );

          return driver.read('phaseWeek.weekStart');
        }).then(function(weekStart) {
          assert.equal(weekStart, '1 / 12 / 2015');
        });
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

      return Promise.all([
        middleMan.once('DELETE', '/utilizations/:id', handleDelete),
        middleMan.once('POST', '/utilizations', handlePost),
        driver.editUtilization({
          name: 'Jerry Seinfeld',
          day: 'thursday',
          type: 'Education'
        })
      ]);
    });

    /**
     * The application should update existing utilizations *before* creating new
     * utilizations. The reverse order will be rejected by the server because it
     * would require the database temporarily enter an invalid state.
     */
    it('correctly splits an existing multi-day utilization', function() {
      var hasPut = false;
      function handlePut(req, res) {
        assert.equal(req.params.id, 4);
        hasPut = true;
        res.end();
      }
      function handlePost(req, res) {
        assert(hasPut, 'Updates existing models before creaating new models');
        res.end();
      }

      return Promise.all([
          middleMan.once('PUT', '/utilizations/:id', handlePut),
          middleMan.once('POST', '/utilizations', handlePost),
          middleMan.once('POST', '/utilizations', handlePost),
          driver.editUtilization({
            name: 'Jerry Seinfeld',
            day: 'tuesday',
            type: 'Vacation'
          })
        ]);
    });

    it('correctly submits a review', function() {
      this.timeout(8000);
      function abort() {
        throw new Error(
          'No requests should be issued until all employees have been verified.'
        );
      }

      return driver.addNote('Everyone did a nice job')
        .then(function() {
          middleMan.on('*', /.*/, abort);
          return driver.submitReview();
        }).then(function() {
          return driver.verify(['Jerry Seinfeld', 'Cosmo Kramer']);
        }).then(function() {
          function handleRequest(req, res) {
            res.end();
          }

          middleMan.off('*', abort);

          return Promise.all([
            middleMan.once('POST', '/project-phase-reviews', handleRequest),
            middleMan.once('PUT', '/utilizations/6', handleRequest),
            middleMan.once('PUT', '/utilizations/7', handleRequest),
            middleMan.once('POST', '/utilizations', handleRequest),
            driver.submitReview()
          ]);
        });
    });

    it('correctly updates upon navigation after submitting a review', function() {
      this.timeout(8000);

      return driver.verify(['Jerry Seinfeld', 'Cosmo Kramer'])
        .then(function() {
          function handleRequest(req, res) {
            res.end();
          }
          function handleReviewSubmission(req, res) {
            res.end(JSON.stringify({ 'project-phase-reviews': { id: 200032 } }));
          }

          return Promise.all([
            middleMan.once('POST', '/project-phase-reviews', handleReviewSubmission),
            middleMan.once('PUT', '/utilizations/6', handleRequest),
            middleMan.once('PUT', '/utilizations/7', handleRequest),
            middleMan.once('POST', '/utilizations', handleRequest),
            driver.submitReview()
          ]);
        })
        .then(function() {
          return driver.count('phaseWeek.verified');
        }).then(function(count) {
          assert.equal(
            count,
            2,
            'Verification information reflects recently-completed operations'
          );

          return driver.cycleReview('next');
        }).then(function() {
          return driver.count('phaseWeek.verified');
        }).then(function(count) {
          assert.equal(
            count, 0, 'Verification information is refreshed after navigation'
          );
        });
    });
  });

  describe('review with utilizations that require "trimming"', function() {
    beforeEach(function() {
      return driver.viewWeek(0, 2);
    });

    it('correctly submits a review', function() {
      this.timeout(8000);

      return driver.addNote('Everyone did a nice job')
        .then(function() {
          return driver.verify(['Jerry Seinfeld']);
        }).then(function() {
          function handleRequest(req, res) {
            res.end();
          }

          return Promise.all([
            middleMan.once('POST', '/project-phase-reviews', handleRequest),
            middleMan.once('PUT', '/utilizations/2', handleRequest),
            middleMan.once('PUT', '/utilizations/3', handleRequest),
            middleMan.once('POST', '/utilizations', handleRequest),
            middleMan.once('POST', '/utilizations', handleRequest),
            driver.submitReview()
          ]);
        });
    });
  });
});
