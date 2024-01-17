'use strict';

const assert = require('assert');
const connectMongoDBSession = require('../');
const ee = require('events').EventEmitter;
const mongodb = require('mongodb');
const sinon = require('sinon');

describe('connectMongoDBSession', function() {
  var StoreStub;

  afterEach(() => sinon.restore());

  beforeEach(function() {
    StoreStub = function() {};
    StoreStub.prototype = { connectMongoDB: 1 };
  });

  describe('options', function() {
    it('can specify uri', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });
      var session = new SessionStore({ uri: 'mongodb://host:1111/db' });
      assert.equal(session.options.uri, 'mongodb://host:1111/db');
      assert.equal(session.options.idField, '_id');
      done();
    });

    it('can specify collection', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });
      var session = SessionStore({ collection: 'notSessions' });
      assert.equal(session.options.uri, 'mongodb://127.0.0.1:27017/test');
      assert.equal(session.options.collection, 'notSessions');
      done();
    });

    it('can specify expires', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });
      var session = new SessionStore({ expires: 25 });
      assert.equal(session.options.uri, 'mongodb://127.0.0.1:27017/test');
      assert.equal(session.options.expires, 25);
      done();
    });

    it('can specify idField', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });
      var session = new SessionStore({ idField: 'sessionId' });
      assert.equal(session.options.uri, 'mongodb://127.0.0.1:27017/test');
      assert.deepEqual(session._generateQuery('1234'), { sessionId: '1234' });
      done();
    });

    it('can specify databaseName', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });
      var session = new SessionStore({ databaseName: 'other_db' });
      assert.equal(session.options.databaseName, 'other_db');
      done();
    });
  });

  it('can get Store object from Express 3', function(done) {
    var SessionStore = connectMongoDBSession({ session: { Store: StoreStub } });
    assert.ok(SessionStore.prototype.connectMongoDB);
    done();
  });

  it('specifying options is optional', function(done) {
    var SessionStore = connectMongoDBSession({ Store: StoreStub });

    var session = new SessionStore(function(error) {
      assert.ifError(error);
      done();
    });
    assert.equal(session.options.uri, 'mongodb://127.0.0.1:27017/test');
  });

  it('uses default options and no callback if no args passed', function(done) {
    var SessionStore = connectMongoDBSession({ Store: StoreStub });

    var session = new SessionStore();
    assert.equal(session.options.uri, 'mongodb://127.0.0.1:27017/test');

    session.on('connected', function() {
      done();
    });
  });

  it('throws an error when connection fails and no callback', function(done) {
    sinon.stub(mongodb.MongoClient.prototype, 'connect').callsFake(() => {
      return Promise.reject(new Error('Cant connect'));
    });

    var SessionStore = connectMongoDBSession({ Store: StoreStub });

    var threw = false;
    try {
      new SessionStore();
    } catch (error) {
      threw = true;
      assert.equal(error.message, 'Error connecting to db: Cant connect');
    }

    done();
  });

  it('passes error to callback if specified', function(done) {
    sinon.stub(mongodb.MongoClient.prototype, 'connect').callsFake(() => {
      return Promise.reject(new Error('connect issues'));
    });

    var SessionStore = connectMongoDBSession({ Store: StoreStub });
    var numSources = 2;
    var store = new SessionStore(function(error) {
      assert.ok(error);
      --numSources || done();
    });
    store.once('error', function(error) {
      assert.ok(error);
      --numSources || done();
    });
  });

  it('handles index errors', function(done) {
    var SessionStore = connectMongoDBSession({ Store: StoreStub });

    sinon.stub(mongodb.Collection.prototype, 'createIndex').callsFake(() => {
      return Promise.reject(new Error('Index fail'));
    });

    var session = new SessionStore(function(error) {
      assert.equal(error.message, 'Error creating index: Index fail');
      done();
    });
  });

  describe('get()', function() {
    it('gets the session', function(done) {
      const SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();

      sinon.stub(session.collection, 'findOne').callsFake(() => {
        return Promise.resolve({ expires: new Date('2040-06-01T00:00:00.000Z'), session: { data: 1 } });
      });
      session.get('1234', function(error, session) {
        assert.ifError(error);
        assert.deepStrictEqual(session, { data: 1 });
        done();
      });
    });

    it('handles get() errors', function(done) {
      const SessionStore = connectMongoDBSession({ Store: StoreStub });

      const session = new SessionStore();
      sinon.stub(session.collection, 'findOne').callsFake(() => {
        return Promise.reject(new Error('fail!'));
      });

      session.get('1234', function(error) {
        assert.ok(error);
        assert.equal(error.message, 'Error finding 1234: fail!');
        done();
      });
    });

    it('calls destroy() on stale sessions', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();
      sinon.stub(session.collection, 'findOne').callsFake(() => {
        return Promise.resolve({ expires: new Date('2011-06-01T00:00:00.000Z') });
      });
      sinon.stub(session.collection, 'deleteOne').callsFake(() => {
        return Promise.resolve();
      });

      session.get('1234', function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc);
        assert.equal(session.collection.deleteOne.getCalls().length, 1);
        done();
      });
    });

    it('returns empty if no session found', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();
      sinon.stub(session.collection, 'findOne').callsFake(() => {
        return Promise.resolve(null);
      });

      session.get('1234', function(error, doc) {
        assert.ifError(error);
        assert.ok(!doc);
        done();
      });
    });
  });

  describe('destroy()', function() {
    it('reports driver errors', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();
      sinon.stub(session.collection, 'deleteOne')
        .callsFake(() => Promise.reject(new Error('roadrunners pachyderma')));

      session.destroy('1234', function(error) {
        assert.ok(error);
        assert.equal(error.message, 'Error destroying 1234: roadrunners pachyderma');
        done();
      });
    });
  });

  describe('set()', function() {
    it('converts expires to a date', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();

      sinon.stub(session.collection, 'updateOne').callsFake(() => {
        return Promise.resolve(null);
      });
      var update = {
        test: 1,
        cookie: { expires: '2011-06-01T00:00:00.000Z' }
      };
      session.set('1234', update, function(error) {
        assert.ifError(error);
        assert.equal(session.collection.updateOne.getCalls().length, 1);
        assert.ok(session.collection.updateOne.getCalls()[0].args[1].$set.expires instanceof Date);
        assert.equal(session.collection.updateOne.getCalls()[0].args[1].$set.expires.getTime(),
          new Date('2011-06-01T00:00:00.000Z').getTime());
        done();
      });
    });

    it('handles set() errors', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();
      sinon.stub(session.collection, 'updateOne').callsFake(() => {
        return Promise.reject(new Error('taco tuesday'));
      });

      session.set('1234', {}, function(error) {
        assert.ok(error);
        assert.equal(error.message, 'Error setting 1234 to {}: taco tuesday');
        done();
      });
    });

    /** For backwards compatibility with connect-mongo */
    it('converts cookies to JSON strings', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();

      sinon.stub(session.collection, 'updateOne').callsFake(() => {
        return Promise.resolve(null);
      });
      var update = {
        test: 1,
        cookie: { toJSON: function() { return 'put that cookie down!'; } }
      };
      session.set('1234', update, function(error) {
        assert.ifError(error);
        assert.equal(session.collection.updateOne.getCalls().length, 1);
        assert.equal(
          session.collection.updateOne.getCalls()[0].args[1].$set.session.cookie,
          'put that cookie down!'
        );
        done();
      });
    });

    /** For backwards compatibility with connect-mongo */
    it('unless they do not have a toJSON()', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();

      sinon.stub(session.collection, 'updateOne').callsFake(() => {
        return Promise.resolve(null);
      });
      var update = {
        test: 1,
        cookie: { test: 2 }
      };
      session.set('1234', update, function(error) {
        assert.ifError(error);
        assert.equal(session.collection.updateOne.getCalls().length, 1);
        assert.deepEqual(
          session.collection.updateOne.getCalls()[0].args[1].$set.session.cookie,
          { test: 2 }
        );
        done();
      });
    });
  });

  describe('clear()', function() {
    it('clears the session store', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();
      sinon.stub(session.collection, 'deleteMany').callsFake(() => Promise.resolve());

      session.clear(function(error) {
        assert.ifError(error);
        assert.ok(session.collection.deleteMany.calledOnce);
        assert.deepStrictEqual(session.collection.deleteMany.getCalls()[0].args[0], {});
        done();
      });
    });

    it('handles set() errors', function(done) {
      var SessionStore = connectMongoDBSession({ Store: StoreStub });

      var session = new SessionStore();
      sinon.stub(session.collection, 'deleteMany').
        callsFake(() => Promise.reject(new Error('clear issue')));

      session.clear(function(error) {
        assert.ok(error);
        assert.equal(error.message, 'Error clearing all sessions: clear issue');
        done();
      });
    });
  });
});
