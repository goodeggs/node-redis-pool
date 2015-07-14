var RedisPool = require('../index')();
var assert = require('assert');
var RedisClient = require('redis').RedisClient;

describe('redis-pool', function() {

  // these tests assume redis-server is running on localhost:6379.

  it('connects', function(cb){
    RedisPool.getClient(function(err, rc, release) {
      assert.equal(err, null, 'no error');
      assert(rc instanceof RedisClient, 'has redis client');
      assert(typeof release === 'function', 'has release function');
      assert.equal(RedisPool._connections.all.length, 1);
      assert.equal(RedisPool._connections.free.length, 0);
      RedisPool.close(rc);
      cb();
    });
  });

  it('counts free', function (cb) {
    RedisPool.getClient(function(err, rc, release) {
      assert.equal(RedisPool._connections.free.length, 0);
      release();
      assert.equal(RedisPool._connections.free.length, 1);
      RedisPool.close(rc);
      cb();
    });
  });

  it('closes all', function(cb) {
    var totalCnt = RedisPool._config.maxConnections, completeCnt = 0;
    var check = function() {
      assert.equal(RedisPool._connections.free.length, 0);
      assert.equal(RedisPool._connections.all.length, totalCnt);
      RedisPool.closeAll();
      assert.equal(RedisPool._connections.all.length, 0);
      cb();
    }
    for (var i = 0; i<totalCnt; i++) {
      RedisPool.getClient(function(err, rc, release) {
        if (++completeCnt == totalCnt) {
          check();
        }
      })
    }
  });

  it('queues', function(cb) {
    var totalCnt = RedisPool._config.maxConnections + 5, completeCnt = 0, closed = 0;
    var check = function() {
      assert.equal(RedisPool._connections.free.length, 0);
      assert.equal(RedisPool._connections.all.length, RedisPool._config.maxConnections);
      assert.equal(RedisPool._queue, 0);
      RedisPool.closeAll();
      cb();
    }
    for (var i = 0; i<totalCnt; i++) {
      RedisPool.getClient(function(err, rc, done) {
        setTimeout(function() {
          assert.equal(RedisPool._queue.length, (5-closed > 0 ? 5-closed : 0));
          done();
          closed++;
          assert.equal(RedisPool._queue.length, (5-closed > 0 ? 5-closed : 0));
        }, 3000);
        if (++completeCnt == totalCnt) {
          check();
        }
      })
    }
  });


});


