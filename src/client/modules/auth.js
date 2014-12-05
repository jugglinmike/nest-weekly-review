'use strict';
var cookies = require('cookies-js');

var TOKEN_NAME = 'black-phoenix-token';

exports.isAuthorized = function() {
  return !!cookies.get(TOKEN_NAME);
};

exports.isEnabled = function() {
  return cookies.enabled;
};
