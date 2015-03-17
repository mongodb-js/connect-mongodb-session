var assert = require('assert');
var connectMongoDBSession = require('../');
var mongodb = require('mongodb');
var strawman = require('strawman');

describe('connectMongoDBSession', function() {
  var db;
  var StoreStub;

  beforeEach(function() {
    db = strawman({
      collection: { argumentNames: ['collection'], chain: true },
      ensureIndex: { argumentNames: ['index', 'options', 'callback'] },
      findOne: { argumentNames: ['query', 'callback'] },
      remove: { argumentNames: ['query', 'callback'] },
      update: { argumentNames: ['query', 'callback' ] }
    });

    mongodb.MongoClient.connect = function(uri, options, callback) {
      process.nextTick(function() { callback(null, db); });
    };

    StoreStub = function() {};
    StoreStub.prototype = {};
  });

  it('specifying options is optional', function(done) {
    var SessionStore = connectMongoDBSession({ Store: StoreStub });
    var numIndexCalls = 0;
    db.ensureIndex.on('called', function(args) {
      assert.equal(++numIndexCalls, 1);
      assert.equal(args.index.expires, 1);
      args.callback();
    });

    var session = new SessionStore(function(error) {
      assert.ifError(error);
      done();
    });
    assert.equal(session.options.uri, 'mongodb://localhost:27017/test');
  });

  it('uses default options and no callback if no args passed', function(done) {
    var SessionStore = connectMongoDBSession({ Store: StoreStub });
    var numIndexCalls = 0;
    db.ensureIndex.on('called', function(args) {
      assert.equal(++numIndexCalls, 1);
      assert.equal(args.index.expires, 1);
      args.callback();
    });

    var session = new SessionStore();
    assert.equal(session.options.uri, 'mongodb://localhost:27017/test');

    session.on('connected', function() {
      done();
    });
  });
});