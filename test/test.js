var RedisPool = require('../index');
var assert = require('assert');
var RedisClient = require('redis').RedisClient;

describe('redis-pool', function() {
  // these tests assume redis-server is running on localhost:6379,
  // and not running on 6380.

  var redisPool;

  beforeEach(function(){
    redisPool = RedisPool();
  });

  it('connects', function(cb){
    redisPool.getClient(function(err, rc, release) {
      assert.equal(err, null, 'no error');
      assert(rc instanceof RedisClient, 'has redis client');
      assert(typeof release === 'function', 'has release function');
      assert.equal(redisPool._connections.all.length, 1);
      assert.equal(redisPool._connections.free.length, 0);
      redisPool.close(rc);
      cb();
    });
  });

  it('counts free', function (cb) {
    redisPool.getClient(function(err, rc, release) {
      assert.equal(redisPool._connections.free.length, 0);
      release();
      assert.equal(redisPool._connections.free.length, 1);
      redisPool.close(rc);
      cb();
    });
  });

  it('closes all', function(cb) {
    var totalCnt = redisPool._config.maxConnections, completeCnt = 0;
    var check = function() {
      assert.equal(redisPool._connections.free.length, 0);
      assert.equal(redisPool._connections.all.length, totalCnt);
      redisPool.closeAll();
      assert.equal(redisPool._connections.all.length, 0);
      cb();
    }
    for (var i = 0; i<totalCnt; i++) {
      redisPool.getClient(function(err, rc, release) {
        if (++completeCnt == totalCnt) {
          check();
        }
      })
    }
  });

  it('queues', function(cb) {
    var totalCnt = redisPool._config.maxConnections + 5, completeCnt = 0, closed = 0;
    var check = function() {
      assert.equal(redisPool._connections.free.length, 0);
      assert.equal(redisPool._connections.all.length, redisPool._config.maxConnections);
      assert.equal(redisPool._queue, 0);
      redisPool.closeAll();
      cb();
    }
    for (var i = 0; i<totalCnt; i++) {
      redisPool.getClient(function(err, rc, done) {
        setTimeout(function() {
          assert.equal(redisPool._queue.length, (5-closed > 0 ? 5-closed : 0));
          done();
          closed++;
          assert.equal(redisPool._queue.length, (5-closed > 0 ? 5-closed : 0));
        }, 3000);
        if (++completeCnt == totalCnt) {
          check();
        }
      })
    }
  });


  describe('connection failure', function() {
    beforeEach(function(){
      redisPool = RedisPool({
        port: 6380    // assuming this is NOT running.
      });
    });

    it('callback gets error', function(cb) {
      redisPool.getClient(function(err, rc) {
        assert(err instanceof Error, 'has error');
        assert(/ECONNREFUSED/.test(err.message));
        assert.equal(rc, null, 'no redis client');
        assert.equal(redisPool._connections.all.length, 0);
        assert.equal(redisPool._connections.free.length, 0);
        assert.equal(redisPool._connections.count, 0);
        cb();
      });
    });
  });


  // doesn't actually work b/c needs a server running that requires a password;
  // otherwise is 'ready' before it tries to auth.
  describe.skip('auth failure', function() {
    beforeEach(function(){
      redisPool = RedisPool({
        port: 6381,
        password: 'zzz'  // assuming this is not the actual password
      });
    });

    it('callback gets error', function(cb) {
      redisPool.getClient(function(err, rc) {
        assert(err instanceof Error, 'has error');
        assert(/auth/i.test(err.message));
        assert.equal(rc, null, 'no redis client');
        assert.equal(redisPool._connections.all.length, 0);
        assert.equal(redisPool._connections.free.length, 0);
        assert.equal(redisPool._connections.count, 0);
        cb();
      });
    });

  });

});

