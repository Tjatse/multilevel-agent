var multilevel = require('multilevel'),
  net = require('net'),
  levelup = require('levelup'),
  util = require('util'),
  EventEmitter = require('events').EventEmitter;

module.exports = LevelServer;

/*
 create a multilevel server
 */
function LevelServer(options) {
  if (!(this instanceof LevelServer)) {
    return new LevelServer(options);
  }
  EventEmitter.call(this);

  this.__genOptions(options);

  this.options.autostart && this.start();
};
util.inherits(LevelServer, EventEmitter);

/**
 * Start multilevel server, when `autostart` option was set to true, this method do nothing help.
 */
LevelServer.prototype.start = function(){
  if(this.state == LevelServer.state.RUNNING){
    return;
  }
  this.__start(this.__getDatabase());
};
/**
 * Stop multilevel server.
 */
LevelServer.prototype.stop = function () {
  if(this.state == LevelServer.state.STOP){
    return;
  }
  this.emit('stop');
};

/**
 * Generate options.
 * @param {Object} options the original options.
 * @private
 */
LevelServer.prototype.__genOptions = function (options) {
  // verify options.
  if (!options || !options.location) {
    throw new Error('Must provide a `location` for the database.');
  }
  if(typeof options.autostart != 'boolean'){
    options.autostart = false;
  }

  // set port to default if not defined.
  isNaN(options.port) && (options.port = 8081);

  // pick auth, access events.
  options.multilevel_args = {};
  // multilevel options: https://github.com/juliangruber/multilevel#multilevelserverdb-authopts
  ['auth', 'access'].forEach(function(k){
    if(typeof options[k] == 'function'){
      options.multilevel_args[k] = options[k];
      delete options[k];
    }
  });

  options.level_args = [];
  // location.
  options.location && options.level_args.push(options.location);
  delete options.location;

  var levelOptions = this.__omit(options, ['port', 'autostart', 'multilevel_args', 'level_args']);
  // levelup options: https://github.com/rvagg/node-levelup#options
  (Object.keys(levelOptions).length > 0) && options.level_args.push(levelOptions);

  this.options = options;

  // initialize state.
  this.state = LevelServer.state.INIT;
};

/**
 * Get levelup database.
 * @param {Object} args
 * @return {*}
 * @private
 */
LevelServer.prototype.__getDatabase = function () {
  var database = levelup.apply(null, this.options.level_args);
  database.once('closed', function () {
    this.emit('close', {source:LevelServer.source.DATABASE});
  }.bind(this));

  return database;
};
/**
 * Start TCP server with multilevel piping.
 * @param {Levelup} database
 * @private
 */
LevelServer.prototype.__start = function (database) {
  var self = this;

  var tcpServer = net.createServer(function (socket) {
    // create multilevel server for each connect.
    var levelServer = multilevel.server(database, self.options.multilevel_args);
    // Notes: when we use rpc-stream, no need to listen
    // `error` event of `levelServer`

    socket.pipe(levelServer).pipe(socket);
    socket.on('error', function(error){
      error.source = LevelServer.source.TCP_CLIENT;
      self.emit('error', error);
    });
    socket.once('close', function () {
      self.emit('close', {source:LevelServer.source.TCP_CLIENT});
    });

    self.emit('connect');
  });

  tcpServer.on('error', function (error) {
    error.source = LevelServer.source.TCP_SERVER;
    self.emit('error', error)
  });
  tcpServer.once('close', function () {
    self.emit('close', {source:LevelServer.source.TCP_SERVER});
  });

  this.once('stop', function () {
    if(this.state == LevelServer.state.STOP){
      return;
    }
    database && database.close();
    database = null;
    tcpServer && tcpServer.close();
    tcpServer = null;
    this.state = LevelServer.state.STOP;
  });

  tcpServer.listen(this.options.port);
  this.state = LevelServer.state.RUNNING;
};

/**
 * Return a copy of the object, filtered to omit the blacklisted keys (or array of keys).
 * @param {Object} object
 * @param {Array} keys
 * @return {Object}
 * @private
 */
LevelServer.prototype.__omit = function(object, keys){
  var retVal = {};
  for(var k in object){
    if(!~keys.indexOf(k) && object.hasOwnProperty(k)){
      retVal[k] = object[k];
    }
  }
  return retVal;
};

/**
 * Event sources.
 * @type {Object}
 */
LevelServer.source = {
  DATABASE: 'database',
  TCP_CLIENT:'tcp_client',
  TCP_SERVER: 'tcp_server',
  LEVEL_SERVER: 'level_server'
};
/**
 * Multilevel states.
 * @type {Object}
 */
LevelServer.state = {
  'INIT': 'init',
  'RUNNING': 'running',
  'STOP': 'STOP'
};