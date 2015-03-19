var assert = require('assert');
var connectMongoDBSession = require('../');
var ee = require('events').EventEmitter;
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
    StoreStub.prototype = { connectMongoDB: 1 };
  });

  it('can get Store object from Express 3', function(done) {
    var SessionStore = connectMongoDBSession({ session: { Store: StoreStub } });
    assert.ok(SessionStore.prototype.connectMongoDB);
    done();
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

  it('throws an error when connection fails and no callback', function(done) {
    mongodb.MongoClient.connect = function(uri, options, callback) {
      // purposely make callback sync
      callback(new Error('Cant connect'));
    };

    var SessionStore = connectMongoDBSession({ Store: StoreStub });
    assert.throws(
      function() {
        new SessionStore();
      },
      'Error connecting to db: Cant connect');
    done();
  });

  it('passes error to callback if specified', function(done) {
    mongodb.MongoClient.connect = function(uri, options, callback) {
      process.nextTick(function() { callback(new Error('Cant connect')); });
    };

    var SessionStore = connectMongoDBSession({ Store: StoreStub });
    var numSources = 2;
    var store = new SessionStore(function(error) {
      assert.ok(error);
      --numSources || done();
    });
    store.on('error', function(error) {
      assert.ok(error);
      --numSources || done();
    });
  });

  it('handles index errors', function(done) {
    var SessionStore = connectMongoDBSession({ Store: StoreStub });
    var numIndexCalls = 0;
    db.ensureIndex.on('called', function(args) {
      assert.equal(++numIndexCalls, 1);
      assert.equal(args.index.expires, 1);
      args.callback(new Error('Index fail'));
    });

    var session = new SessionStore(function(error) {
      assert.equal(error.message, 'Error creating index: Index fail');
      done();
    });
  });

  it('buffers get() calls', function(done) {
    var SessionStore = connectMongoDBSession({ Store: StoreStub });
    var numIndexCalls = 0;
    var emitter = new ee();

    mongodb.MongoClient.connect = function(uri, options, callback) {
      emitter.on('success', function() {
        callback(null, db);
      });
    };

    db.ensureIndex.on('called', function(args) {
      assert.equal(++numIndexCalls, 1);
      assert.equal(args.index.expires, 1);
      args.callback();
    });

    var session = new SessionStore();

    db.findOne.on('called', function(args) {
      args.callback(null,
        { expires: new Date('2040-06-01T00:00:00.000Z'), session: { data: 1 } });
    });
    session.get('1234', function(error) {
      assert.ifError(error);
      assert.equal(numIndexCalls, 1);
      done();
    });

    setImmediate(function() {
      emitter.emit('success');
    });
  });
});