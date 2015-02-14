'use strict';
var Model = require('ampersand-model');
var extend = require('lodash.assign');
var Promise = require('ractive/ractive.runtime').Promise;

var parse = require('../../util/parse-json-api-resp');
var setBearer = require('../../ajax-config');
var API_ROOT = require('../../api-root');

var superSerialize = Model.prototype.serialize;
var superSave = Model.prototype.save;
var superDestroy = Model.prototype.destroy;

module.exports = Model.extend({
  ajaxConfig: setBearer,

  constructor: function() {
    Model.apply(this, arguments);

    this.on('change', function() {
      this.set('_isDirty', true, { silent: true });
    });
    this.on('sync', function() {
      this.set('_isDirty', false, { silent: true });
    });
  },

  urlRoot: function() {
    return API_ROOT + '/' + this.getType();
  },

  parse: function(data) {
    return parse(this.getType(), data);
  },

  session: {
    _isDirty: 'bool'
  },

  /**
   * Determine if the model has changes that need to be propagated to the
   * server.
   *
   * This method tracks "dirtiness" via a session attribute that is modified in
   * response to `change` and `sync` events. Because `change` events may be
   * suppressed via the `silent` flag, the method falls back to Ampersand
   * State's `hasChanged` method.
   *
   * @returns {boolean}
   */
  isDirty: function() {
    var changedAttrs = this.changedAttributes();
    var changedKeys = changedAttrs && Object.keys(changedAttrs);
    var hasChanged;

    // Do not consider a model "dirty" if the only changed value is the
    // internal `_isDirty` flag (this will be the only changed attribute after
    // successful `sync` events, where the flag is set from `true` to `false`.
    if (changedKeys && changedKeys.length > 1) {
      hasChanged = true;
    } else if (changedKeys && changedKeys.length === 1) {
      hasChanged = changedKeys[0] !== '_isDirty';
    } else {
      hasChanged = false;
    }

    return this.get('_isDirty') || hasChanged;
  },

  serialize: function() {
    var type = this.getType();
    var collectionType = this.collection && this.collection.getType();
    var serialized;

    if (collectionType && collectionType !== type) {
      throw new Error(
        'Model and collection type mismatch ' +
        '(model: "' + type + '", collection: "' + collectionType + '")'
      );
    }

    serialized = {};
    serialized[type] = superSerialize.call(this);
    var links = {};
    var hasLinks = false;

    this.constructor.prototype.__children.forEach(function(key) {
      hasLinks = true;
      extend(links, serialized[type][key]);
      delete serialized[type][key];
    }, this);

    this.constructor.prototype.__collections.forEach(function(key) {
      hasLinks = true;
      extend(links, serialized[type][key]);
      delete serialized[type][key];
    }, this);

    if (hasLinks) {
      serialized.links = links;
    }

    return serialized;
  },

  destroy: function(options) {
    var onSuccess = options && options.success;
    var onError = options && options.error;
    options = extend({}, options);

    return new Promise(function(resolve, reject) {
      options.success = function() {
        resolve();

        if (onSuccess) {
          onSuccess.apply(this, arguments);
        }
      };
      options.error = function(model, response) {
        reject(response.responseText);

        if (onError) {
          onError.apply(this, arguments);
        }
      };

      superDestroy.call(this, options);
    }.bind(this));
  },

  save: function(attrs, options) {
    var onSuccess = options && options.success;
    var onError = options && options.error;
    options = extend({}, options);

    return new Promise(function(resolve, reject) {
      options.success = function() {
        resolve();

        if (onSuccess) {
          onSuccess.apply(this, arguments);
        }
      };
      options.error = function(model, response) {
        reject(response.responseText);

        if (onError) {
          onError.apply(this, arguments);
        }
      };

      superSave.call(this, attrs, options);
    }.bind(this));
  }
});

/**
 * The names of nested properties are required for correct serialization.
 * Ampersand.js tracks `children` and `collections` internally, but it
 * maintains those references through private APIs. To promote long-term
 * stability, spy on the static `extend` method and create custom references to
 * these property names.
 */
module.exports.extend = function(options) {
  var Ctor = Model.extend.apply(this, arguments);
  if (options && options.children) {
    Ctor.prototype.__children = Object.keys(options.children);
  } else {
    Ctor.prototype.__children = [];
  }

  if (options && options.collections) {
    Ctor.prototype.__collections = Object.keys(options.collections);
  } else {
    Ctor.prototype.__collections = [];
  }

  return Ctor;
};
