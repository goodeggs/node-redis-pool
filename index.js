var redis = require('redis');
var settings = require('./default-settings');
var helpers = require('./helpers');

module.exports = function(config) {
  return new RedisPool(config);
};

function RedisPool(config) {
  var config = helpers.mergeOptions(settings, config);
  this._config = config;
  this._connections = {
    all: [],
    free: [],
    count: 0
  };
  this._queue = [];
};

RedisPool.prototype.getClient = function(cb) {
  var rc;
  var RP = this;
  if ((rc = this._getFreeClient()) != null) {
    cb(null, rc, function() {
      RP.release(rc);
    });
  }
  else if (this._connections.count >= this._config.maxConnections) {
    this._queue.push(cb);
  }
  else {
    this._createClient(cb);
  }
};

RedisPool.prototype._getFreeClient = function() {
  if (this._connections.free.length > 0) {
    var rc = this._connections.free[0];
    helpers.removeArrayEl(this._connections.free, rc);
    return rc;
  }
  return null;
};

RedisPool.prototype._createClient = function(_cb) {
  this._connections.count++;  // optimistic
  var RP = this;
  var rc;

  function onError(e) {
    cb(e);
  }

  function onReady() {
    cb();
  }

  var cbDone = false;  // only callable once
  function cb(err) {
    if (!cbDone) {
      cbDone = true;

      rc.removeListener('ready', onReady);
      rc.removeListener('error', onError);

      if (err) {
        RP.close(rc, true); // force close (can't send QUIT if not connected)
        _cb(err);
        return;
      }

      RP._connections.all.push(rc);

      _cb(null, rc, function() {
        RP.release(rc);
      });
    }
  }
  rc = redis.createClient(this._config.port, this._config.host, this._config.options);

  if (this._config.password) {
    rc.auth(this._config.password, function(err) {
      if (err) cb(err);   // rest of fn continues, but `cb` won't be called again.
    });
  }

  rc.once('ready', onReady);
  rc.once('error', onError);
};

RedisPool.prototype.close = function(rc, force) {
  helpers.removeArrayEl(this._connections.free, rc);
  helpers.removeArrayEl(this._connections.all, rc);
  this._connections.count--;

  if (force)
    rc.end();
  else
    rc.quit();

  this._releaseQueue();
};

RedisPool.prototype.release = function(rc) {
  if (this._connections.free.indexOf(rc) == -1 && this._connections.all.indexOf(rc) != -1) {
    this._connections.free.push(rc);
    this._releaseQueue();
  }
};

RedisPool.prototype._releaseQueue = function() {
  if (this._queue.length > 0) {
    var cb = this._queue[0];
    helpers.removeArrayEl(this._queue, cb);  // TODO why not just `shift`?
    this.getClient(cb);
  }
};

RedisPool.prototype.closeAll = function() {
  for (var i = this._connections.all.length - 1; i>=0; i--) {
    this.close(this._connections.all[i]);
  }
};
