var mongodb = require('mongodb');

module.exports = function(connect) {
  var Store = connect.Store || connect.session.Store;

  var MongoDBStore = function(options, callback) {
    var _this = this;

    Store.call(this, options);
    this._options = options;

    mongodb.MongoClient.connect(options.uri, function(error, db) {
      if (error) {
        if (callback) {
          return callback(error);
        }
        throw new Error('Error connecting to db: ' + error);
      }

      _this.db = db;

      db.
        collection(options.collection).
        ensureIndex({ expires: 1 }, { expireAfterSeconds: 0 }, function(error) {
          if (error) {
            if (callback) {
              return callback(error);
            }
            throw new Error('Error creating index: ' + error);
          }

          return callback();
        });
    });
  };

  MongoDBStore.prototype = Object.create(Store);

  MongoDBStore.prototype.get = function(id, callback) {
    var _this = this;
    this.db.collection(this.options.collection).
      findOne({ _id: id }, function(error, session) {
        if (error) {
          return callback(error);
        } else if (session) {
          if (!session.expires || new Date < session.expires) {
            return callback(session);
          } else {
            return _this.destroy(id, callback);
          }
        } else {
          return callback();
        }
      });
  };

  MongoDBStore.prototype.destroy = function(id, callback) {
    this.db.collection(this.options.collection).
      remove({ _id: id }, function(error) {
        callback && callback(error);
      });
  };

  MongoDBStore.prototype.set = function(id, session, callback) {
    var s = { _id: id, session: session };

    if (session && session.cookie && session.cookie.expires) {
      s.expires = new Date(session.cookie.expires);
    } else {
      var now = new Date();
      s.expires = new Date(now.getTime() + this.options.expires);
    }

    this.db.collection(this.options.collection).
      update({ _id: id }, s, { upsert: true }, function(error) {
        callback && callback(error);
      });
  };

  return MongoDBStore;
};