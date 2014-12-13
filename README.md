# connect-mongodb-session

[MongoDB](http://mongodb.com)-backed session storage for [connect](https://www.npmjs.org/package/connect) and [Express](http://www.expressjs.com). Meant to be a well-maintained and fully-featured replacement for modules like [connect-mongo](https://www.npmjs.org/package/connect-mongo)

# API

## MongoDBStore

This module exports a single function which takes an instance of connect
(or Express) and returns a `MongoDBStore` class that can be used to
store sessions in MongoDB.

#### It can store sessions for Express 4

If you pass in an instance of the
[`express-session` module](http://npmjs.org/package/express-session)
the MongoDBStore class will enable you to store your Express sessions
in MongoDB.

**Note:** You can pass a callback to the `MongoDBStore` constructor,
but this is entirely optional. The Express 3.x example demonstrates
that you can use the MongoDBStore class in a synchronous-like style: the
module will manage the internal connection state for you.

```javascript
    
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
              server.close();
              done();
            });
          });
        });
      });
  
```

#### It can store sessions for latest Express 3.x

If you're using Express 3.x, you need to pass the Express module itself
rather than the `express-session` module. Session storage is part of
the Express core in 3.x but not in 4.x.

**Note:** This example doesn't pass a callback to the `MongoDBStore`
constructor. This module can queue up requests to execute once the
database is connected. However, the `MongoDBStore` constructor will
throw an exception if it can't connect and no callback is passed.

```javascript
    
    var express = require('../vendor/express-3.18.1');

    var MongoDBStore = connectMongoDB(express);

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
      store: store
    }));

    app.get('/', function(req, res) {
      res.send('Hello ' + JSON.stringify(req.session));
    });

    var server = app.listen(3000);

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
          server.close();
          done();
        });
      });
    });
  
```

