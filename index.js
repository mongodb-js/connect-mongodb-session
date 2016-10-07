var mongodb = require('mongodb');
var EventEmitter = require('events').EventEmitter;

/**
 * Returns a constructor with the specified connect middleware's Store
 * class as its prototype
 *
 * ####Example:
 *
 *     connectMongoDBSession(require('express-session'));
 *
 * @param {Function} connect connect-compatible session middleware (e.g. Express 3, express-session)
 * @api public
 */
module.exports = function(connect) {
  var Store = connect.Store || connect.session.Store;
  var defaults = {
    uri: 'mongodb://localhost:27017/test',
    collection: 'sessions',
    connectionOptions: {},
    expires: 1000 * 60 * 60 * 24 * 14, // 2 weeks
    idField: '_id'
  };

  var MongoDBStore = function(options, callback) {
    var _this = this;
    this._emitter = new EventEmitter();
    this._errorHandler = handleError.bind(this);

    if (typeof options === 'function') {
      callback = options;
      options = {};
    } else {
      options = options || {};
    }

    mergeOptions(options, defaults);

    Store.call(this, options);
    this.options = options;

    var connOptions = options.connectionOptions;
    mongodb.MongoClient.connect(options.uri, connOptions, function(error, db) {
      if (error) {
        var e = new Error('Error connecting to db: ' + error.message);
        return _this._errorHandler(e, callback);
      }

      db.
        collection(options.collection).
        ensureIndex({ expires: 1 }, { expireAfterSeconds: 0 }, function(error) {
          if (error) {
            var e = new Error('Error creating index: ' + error.message);
            return _this._errorHandler(e, callback);
          }

          _this.db = db;
          _this._emitter.emit('connected');

          return callback && callback();
        });
    });
  };

  MongoDBStore.prototype = Object.create(Store.prototype);

  MongoDBStore.prototype._generateQuery = function(id) {
    var ret = {};
    ret[this.options.idField] = id;
    return ret;
  };

  MongoDBStore.prototype.get = function(id, callback) {
    var _this = this;

    if (!this.db) {
      return this._emitter.once('connected', function() {
        _this.get.call(_this, id, callback);
      });
    }

    this.db.collection(this.options.collection).
      findOne(this._generateQuery(id), function(error, session) {
        if (error) {
          var e = new Error('Error finding ' + id + ': ' + error.message);
          return _this._errorHandler(e, callback);
        } else if (session) {
          if (!session.expires || new Date < session.expires) {
            return callback(null, session.session);
          } else {
            return _this.destroy(id, callback);
          }
        } else {
          return callback();
        }
      });
  };

  MongoDBStore.prototype.destroy = function(id, callback) {
    var _this = this;
    if (!this.db) {
      return this._emitter.once('connected', function() {
        _this.destroy.call(_this, id, callback);
      });
    }

    this.db.collection(this.options.collection).
      remove(this._generateQuery(id), function(error) {
        if (error) {
          var e = new Error('Error destroying ' + id + ': ' + error.message);
          return _this._errorHandler(e, callback);
        }
        callback && callback();
      });
  };

  MongoDBStore.prototype.clear = function(callback) {
    var _this = this;
    if (!this.db) {
      return this._emitter.once('connected', function() {
        _this.clear.call(_this, callback);
      });
    }

    this.db.collection(this.options.collection).
      remove({}, function(error) {
        if (error) {
          var e = new Error('Error clearing all sessions: ' + error.message);
          return _this._errorHandler(e, callback);
        }
        callback && callback();
      });
  };

  MongoDBStore.prototype.set = function(id, session, callback) {
    var _this = this;

    if (!this.db) {
      return this._emitter.once('connected', function() {
        _this.set.call(_this, id, session, callback);
      });
    }

    var sess = {};
    for (var key in session) {
      if (key === 'cookie') {
        sess[key] = session[key].toJSON ? session[key].toJSON() : session[key];
      } else {
        sess[key] = session[key];
      }
    }

    var s = this._generateQuery(id);
    s.session = sess;
    if (session && session.cookie && session.cookie.expires) {
      s.expires = new Date(session.cookie.expires);
    } else {
      var now = new Date();
      s.expires = new Date(now.getTime() + this.options.expires);
    }

    this.db.collection(this.options.collection).
      update(this._generateQuery(id), s, { upsert: true }, function(error) {
        if (error) {
          var e = new Error('Error setting ' + id + ' to ' +
            require('util').inspect(session) + ': ' + error.message);
          return _this._errorHandler(e, callback);
        }
        callback && callback();
      });
  };

  MongoDBStore.prototype.on = function() {
    this._emitter.on.apply(this._emitter, arguments);
  };

  MongoDBStore.prototype.once = function() {
    this._emitter.once.apply(this._emitter, arguments);
  };

  return MongoDBStore;
};

function handleError(error, callback) {
  if (this._emitter.listeners('error').length) {
    this._emitter.emit('error', error);
  }

  if (callback) {
    callback(error);
  }

  if (!this._emitter.listeners('error').length && !callback) {
    throw error;
  }
}

function mergeOptions(options, defaults) {
  for (var key in defaults) {
    options[key] = options[key] || defaults[key];
  }
}
