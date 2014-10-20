var multilevel = require('multilevel'),
  net = require('net'),
  levelup = require('levelup'),
  util = require('util'),
  dynamicTimer = require('dynamic-timer'),
  EventEmitter = require('events').EventEmitter;

module.exports = LevelClient;

/*
 Create a multilevel client.
 */
function LevelClient(options) {
  if (!(this instanceof LevelClient)) {
    return new LevelClient(options);
  }
  EventEmitter.call(this);

  this.__genOptions(options);
  this.__genTimer();
  this.__connect();
}
util.inherits(LevelClient, EventEmitter);

/**
 * Generate options.
 * @param {Object} options the original options.
 * @return {*}
 * @private
 */
LevelClient.prototype.__genOptions = function (options) {
  // verify options.
  if (!options || !options.host) {
    throw new Error('Must provide a `host` for the database.');
  }

  // verify port port.
  isNaN(options.port) && (options.port = 8081);

  // TCP parameters.
  options.tcp = {
    host:options.host,
    port:options.port
  };
  delete options.host;
  delete options.port;

  this.options = options;

  // initialize state.
  this.state = LevelClient.state.INIT;
};

/**
 * Get multilevel client.
 * @param {Object} options
 * @return {*}
 * @private
 */
LevelClient.prototype.__getDatabase = function () {
  // create database instance.
  // manifest: https://github.com/juliangruber/multilevel#var-db--multilevelclientmanifest
  var database = multilevel.client.apply(null, this.options.manifest);

  // handle client events.
  database.on('error', function (error) {
    error.source = LevelClient.source.DATABASE;
    this.emit('error', error);
  }.bind(this));

  database.on('open', function () {
    this.emit('connect', {source:LevelClient.source.DATABASE});
  }.bind(this));

  database.once('close', function () {
    this.emit('database:close');
  }.bind(this));
  return database;
};

/**
 * Create a TCP client connect to multilevel-server
 * @param {Object} options
 * @return {*}
 * @private
 */
LevelClient.prototype.__createTCPClient = function () {
  // connect to server.
  var client = net.connect(this.options.tcp);

  // handle events.
  client.on('error', function (error) {
    error.source = LevelClient.source.TCP_CLIENT;
    this.emit('error', error)
  }.bind(this));
  client.on('connect', function () {
    this.state = LevelClient.state.RUNNING;
    this.reconnectTimeout.stop();
    this.emit('connect', {source:LevelClient.source.TCP_CLIENT})
  }.bind(this));

  return client;
};
/**
 * Connect to TCP server.
 * @param {Object} options
 * @private
 */
LevelClient.prototype.__connect = function (options) {
  var client = this.__createTCPClient();

  // get multilevel-client
  if(!this.db){
    this.db = this.__getDatabase();

    // handle database crash event and reconnect.
    this.once('database:close', function(){
      // destroy socket connection.
      client && client.destroy();
      client = null;

      delete this.db;

      if(this.state == LevelClient.state.STOP){
        return;
      }
      this.state = LevelClient.state.STOP;
      this.reconnectTimeout.start();
    }.bind(this));
  }

  // using RPC stream to transport data.
  var rpcStream = this.db.createRpcStream();
  rpcStream.on('error', function(error){
    error.source = LevelClient.source.RPC_STREAM;
    this.emit('error', error)
  }.bind(this));
  client.pipe(rpcStream).pipe(client);

  // Try to reconnect when `close`, `end` and `timeout` events are happening.
  var onDisconnect = function(){
    rpcStream && rpcStream.close();
    rpcStream = null;

    this.__reconnect();
    onDisconnect = null;
  };
  client.once('timeout', onDisconnect.bind(this));
  client.once('end', onDisconnect.bind(this));
  client.once('close', onDisconnect.bind(this));
};

/**
 * Generate reconnect timer.
 * @private
 */
LevelClient.prototype.__genTimer = function(){
  this.reconnectTimeout = dynamicTimer({
    overrun: dynamicTimer.state.RESET,
    maxAttempts: 1000,
    strategy: dynamicTimer.strategy.PROCESSION,
    seed: 1000
  });
  this.reconnectTimeout.on('tick', function(){
    if(this.state == LevelClient.state.STOP){
      this.emit('reconnecting', {
        attempts: this.reconnectTimeout.attempts,
        delay: this.reconnectTimeout.delay
      });
      return this.__connect();
    }
  }.bind(this))
};

/**
 * Reconnect to database or TCP server.
 * @private
 */
LevelClient.prototype.__reconnect = function(){
  if(this.state == LevelClient.state.STOP){
    return;
  }

  this.state = LevelClient.state.STOP;
  this.reconnectTimeout.start();
};

/**
 * Event sources.
 * @type {Object}
 */
LevelClient.source = {
  DATABASE: 'database',
  TCP_CLIENT:'tcp_client',
  RPC_STREAM: 'rpc_stream',
  LEVEL_SERVER: 'level_server'
};
/**
 * Multilevel states.
 * @type {Object}
 */
LevelClient.state = {
  'INIT': 'init',
  'RUNNING': 'running',
  'STOP': 'stop'
};