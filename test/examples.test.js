var assert = require('assert');
var request = require('request');
var mongodb = require('mongodb');

/**
 *  This module exports a single function which takes an instance of connect
 *  (or Express) and returns a `MongoDBStore` class that can be used to
 *  store sessions in MongoDB.
 */
describe('MongoDBStore', function() {
  var underlyingDb;
  var server;

  beforeEach(function(done) {
    mongodb.MongoClient.connect(
      'mongodb://localhost:27017/connect_mongodb_session_test',
      function(error, db) {
        if (error) {
          return done(error);
        }
        underlyingDb = db;
        db.collection('mySessions').remove({}, function(error) {
          return done(error);
        });
      });
  });

  afterEach(function() {
    server.close();
  });

  /**
   *  If you pass in an instance of the
   *  [`express-session` module](http://npmjs.org/package/express-session)
   *  the MongoDBStore class will enable you to store your Express sessions
   *  in MongoDB.
   *
   *  The MongoDBStore class has 2 required options:
   *
   *  1. `uri`: a [MongoDB connection string](http://docs.mongodb.org/manual/reference/connection-string/)
   *  2. `collection`: the MongoDB collection to store sessions in
   *
   *  **Note:** You can pass a callback to the `MongoDBStore` constructor,
   *  but this is entirely optional. The Express 3.x example demonstrates
   *  that you can use the MongoDBStore class in a synchronous-like style: the
   *  module will manage the internal connection state for you.
   */
  it('can store sessions for Express 4', function(done) {
    var express = require('express');
    var session = require('express-session');
    var MongoDBStore = require('connect-mongodb-session')(session);

    var app = express();
    var store = new MongoDBStore(
      {
        uri: 'mongodb://localhost:27017/connect_mongodb_session_test',
        collection: 'mySessions'
      });

    // Catch errors
    store.on('error', function(error) {
      assert.ifError(error);
      assert.ok(false);
    });

    app.use(require('express-session')({
      secret: 'This is a secret',
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
      },
      store: store,
      // Boilerplate options, see:
      // * https://www.npmjs.com/package/express-session#resave
      // * https://www.npmjs.com/package/express-session#saveuninitialized
      resave: true,
      saveUninitialized: true
    }));

    app.get('/', function(req, res) {
      res.send('Hello ' + JSON.stringify(req.session));
    });

    server = app.listen(3000);

    // acquit:ignore:start
    underlyingDb.collection('mySessions').count({}, function(error, count) {
      assert.ifError(error);
      assert.equal(0, count);

      request('http://localhost:3000', function(error, response, body) {
        assert.ifError(error);
        assert.equal(1, response.headers['set-cookie'].length);
        var cookie = require('cookie').parse(response.headers['set-cookie'][0]);
        assert.ok(cookie['connect.sid']);
        underlyingDb.collection('mySessions').count({}, function(error, count) {
          assert.ifError(error);
          assert.equal(1, count);
          var config = {
            url: 'http://localhost:3000',
            headers: { 'Cookie': 'connect.sid=' + cookie['connect.sid'] }
          };
          request(config, function(error, response, body) {
            assert.ok(!response.headers['set-cookie']);
            store.clear(function(error) {
              assert.ifError(error);
              underlyingDb.collection('mySessions').count({}, function(error, count) {
                assert.ifError(error);
                assert.equal(0, count);
                done();
              });
            });
          });
        });
      });
    });
    // acquit:ignore:end
  });

  /**
   *  If you're using Express 3.x, you need to pass the Express module itself
   *  rather than the `express-session` module. Session storage is part of
   *  the Express core in 3.x but not in 4.x.
   *
   *  **Note:** This example doesn't pass a callback to the `MongoDBStore`
   *  constructor. This module can queue up requests to execute once the
   *  database is connected. However, the `MongoDBStore` constructor will
   *  throw an exception if it can't connect and no callback is passed.
   */
  it('can store sessions for latest Express 3.x', function(done) {
    var express = require('../vendor/express-3.18.1');

    var MongoDBStore = require('connect-mongodb-session')(express);

    var app = express();
    var store = new MongoDBStore(
      {
        uri: 'mongodb://localhost:27017/connect_mongodb_session_test',
        collection: 'mySessions'
      });

    app.use(express.session({
      secret: 'This is a secret',
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
      },
      store: store,
      // Boilerplate options, see:
      // * https://www.npmjs.com/package/express-session#resave
      // * https://www.npmjs.com/package/express-session#saveuninitialized
      resave: true,
      saveUninitialized: true
    }));

    app.get('/', function(req, res) {
      res.send('Hello ' + JSON.stringify(req.session));
    });

    server = app.listen(3000);

    // acquit:ignore:start
    underlyingDb.collection('mySessions').count({}, function(error, count) {
      assert.ifError(error);
      assert.equal(0, count);

      request('http://localhost:3000', function(error, response, body) {
        assert.ifError(error);
        assert.equal(1, response.headers['set-cookie'].length);
        var cookie = require('cookie').parse(response.headers['set-cookie'][0]);
        assert.ok(cookie['connect.sid']);

        underlyingDb.collection('mySessions').find({}).toArray(function(error, docs) {
          assert.ifError(error);
          assert.equal(1, docs.length);
          assert.equal(typeof docs[0]._id, 'string');
          done();
        });
      });
    });
    // acquit:ignore:end
  });

  /**
   *  You should pass a callback to the `MongoDBStore` constructor to catch
   *  errors. If you don't pass a callback to the `MongoDBStore` constructor,
   *  `MongoDBStore` will `throw` if it can't connect.
   */
  it('throws an error when it can\'t connect to MongoDB', function(done) {
    var express = require('../vendor/express-3.18.1');

    var MongoDBStore = require('connect-mongodb-session')(express);

    var app = express();
    var numExpectedSources = 2;
    var store = new MongoDBStore(
      {
        uri: 'mongodb://bad.host:27000/connect_mongodb_session_test?connectTimeoutMS=10',
        collection: 'mySessions'
      },
      function(error) {
        // Should have gotten an error
        // acquit:ignore:start
        assert.ok(error);
        --numExpectedSources || done();
        // acquit:ignore:end
      });

    store.on('error', function(error) {
      // Also get an error here
      // acquit:ignore:start
      assert.ok(error);
      --numExpectedSources || done();
      // acquit:ignore:end
    });

    app.use(express.session({
      secret: 'This is a secret',
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
      },
      store: store,
      // Boilerplate options, see:
      // * https://www.npmjs.com/package/express-session#resave
      // * https://www.npmjs.com/package/express-session#saveuninitialized
      resave: true,
      saveUninitialized: true
    }));

    app.get('/', function(req, res) {
      res.send('Hello ' + JSON.stringify(req.session));
    });

    server = app.listen(3000);
  });
});
