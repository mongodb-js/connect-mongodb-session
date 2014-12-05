var assert = require('assert');
var connectMongoDB = require('../');
var request = require('request');
var mongodb = require('mongodb');

/**
 *  This module exports a single function which takes an instance of connect
 *  (or Express) and returns a `MongoDBStore` class that can be used to
 *  store sessions in MongoDB.
 */
describe('MongoDBStore', function() {
  beforeEach(function(done) {
    mongodb.MongoClient.connect(
      'mongodb://localhost:27017/connect_mongodb_session_test',
      function(error, db) {
        if (error) {
          return done(error);
        }
        db.collection('mySessions').remove({}, function(error) {
          return done(error);
        });
      });
  });

  /**
   *  If you pass in an instance of the
   *  [`express-session` module](http://npmjs.org/package/express-session)
   *  the MongoDBStore class will enable you to store your Express sessions
   *  in MongoDB.
   */
  it('can store sessions for Express 4', function(done) {
    var express = require('express');

    var MongoDBStore = connectMongoDB(require('express-session'));

    var app = express();
    var store = new MongoDBStore(
      { 
        uri: 'mongodb://localhost:27017/connect_mongodb_session_test',
        collection: 'mySessions'
      },
      function(error) {
        assert.ifError(error);

        app.use(require('express-session')({
          secret: 'This is a secret',
          cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
          },
          store: store
        }));

        app.get('/', function(req, res) {
          res.send('Hello ' + JSON.stringify(req.session));
        });

        var server = app.listen(3000);

        store.db.collection('mySessions').count({}, function(error, count) {
          assert.ifError(error);
          assert.equal(0, count);

          request('http://localhost:3000', function(error, response, body) {
            assert.ifError(error);
            assert.equal(1, response.headers['set-cookie'].length);
            var cookie = require('cookie').parse(response.headers['set-cookie'][0]);
            assert.ok(cookie['connect.sid']);
            store.db.collection('mySessions').count({}, function(error, count) {
              assert.ifError(error);
              assert.equal(1, count);
              server.close();
              done();
            });
          });
        });
      });
  });

  /**
   *  If you're using Express 3.x, you need to pass the Express module itself
   *  rather than the `express-session` module. Session storage is part of
   *  the Express core in 3.x but not in 4.x.
   */
  it('can store sessions for latest Express 3.x', function(done) {
    var express = require('../vendor/express-3.18.1');

    var MongoDBStore = connectMongoDB(express);

    var app = express();
    var store = new MongoDBStore(
      {
        uri: 'mongodb://localhost:27017/connect_mongodb_session_test',
        collection: 'mySessions'
      },
      function(error) {
        assert.ifError(error);

        app.use(express.session({
          secret: 'This is a secret',
          cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
          },
          store: store
        }));

        app.get('/', function(req, res) {
          res.send('Hello ' + JSON.stringify(req.session));
        });

        var server = app.listen(3000);

        store.db.collection('mySessions').count({}, function(error, count) {
          assert.ifError(error);
          assert.equal(0, count);

          request('http://localhost:3000', function(error, response, body) {
            assert.ifError(error);
            assert.equal(1, response.headers['set-cookie'].length);
            var cookie = require('cookie').parse(response.headers['set-cookie'][0]);
            assert.ok(cookie['connect.sid']);
            store.db.collection('mySessions').count({}, function(error, count) {
              assert.ifError(error);
              assert.equal(1, count);
              server.close();
              done();
            });
          });
        });
      });
  });
});
