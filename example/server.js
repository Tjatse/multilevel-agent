var MultilevelServer = require('../').Server,
  util = require('util');

var server = MultilevelServer({
  location: __dirname + '/db/',
  port: 8090,
  auth: function (user, cb) {
    if (user.name == 'root' && user.pass == 'p@ss') {
      cb(null, {name: 'root'});
    } else {
      cb(new Error('not authorized'));
    }
  },
  access: function (user, db, method, args) {
    if (!user || user.name !== 'root') {
      if (/^put|^del|^batch|write/i.test(method)) {
        throw new Error('read-only access');
      }
    }
  }
});

server.on('error', function(err){
  util.error(err.source + ': ' + err.message);
});

server.on('connect', function(){
  util.log('client connected');
});

server.on('close', function(agent){
  if(agent.source == MultilevelServer.source.DATABASE){
    return process.exit(0);
  }
  util.log(agent.source + ' was closed - event: ' + agent.event || 'close');
});

server.start();

util.log('multilevel server '+ server.state.toUpperCase() +' at port:', server.options.port);