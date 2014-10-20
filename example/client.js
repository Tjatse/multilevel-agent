var MultilevelClient = require('../').Client,
  util = require('util');
var client = MultilevelClient({
  host: 'localhost',
  port: 8090
});

client.on('error', function(err){
  util.error(err.source + ': ' + err.message);
});
client.on('connect', function(agent){
  util.log(agent.source + ' connected');
});
client.on('reconnecting', function(o){
  util.log('attempts #' + o.attempts + ', next after ' + o.delay + 'ms');
})

client.db.auth({ name: 'root', pass: 'p@ss' }, function (err, data) {
  if (err){
    return util.error('auth failed: ' + err.message);
  }
  util.log('logged in');
});

setTimeout(function(){
  client.db.deauth(function (err) {
    if(err){
      return util.log('sign out failed: ' + err.message)
    }
    util.log('sign out succeed.');
    client.db.put('key', 'value');
  });
}, 5000);

//client.db.put('key', 'value');

/*
setTimeout(function(){
  client.db.get('key', function(err, value){
    console.log(err, value);
  });
}, 5000);*/