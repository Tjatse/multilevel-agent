multilevel-agent [![NPM version](https://badge.fury.io/js/multilevel-agent.svg)](http://badge.fury.io/js/multilevel-agent) [![Build Status](https://travis-ci.org/Tjatse/multilevel-agent.svg?branch=master)](https://travis-ci.org/Tjatse/multilevel-agent)
================

makes multilevel server/client simpler, with auto restart and reconnect.

## Installation
```
npm install multilevel-agent
```

## Usage
```javascript
var multilevelAgent = require('multilevel-agent');
```

### Server
```javascript
var server = multilevelAgent.Server([options]);
```
The `options` could have below properties:
- **location** The directory where to storage your data(**required**).
- **autostart** A value indicates whether automatic start the SERVER or not, `false` as default.
- **port** Port of TCP server, `8081` as default.
- **auth** and **access** from [multilevel](https://github.com/juliangruber/multilevel#authentication)
- **options** from [levelup](https://github.com/rvagg/node-levelup#options)

#### Example
```javascript
var server = multilevelAgent.Server({
  location: __dirname + '/db/',
  port: 8090,
  valueEncoding: 'json',
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
```
See more from `example/server.js`.

#### Events
##### error
Emitted when an error occurs, e.g.:
```javascript
server.on('error', function(err){

});
```
The `err` is an instance of `Error`, and in addition, `err` has one more property `err.source`, see more from [sources](#sources).

##### connect
Emitted when a new TCP connection is made, e.g.:
```javascript
server.on('connect', function(){

});
```

##### close
Emitted when the server/client/database closes, e.g.:
```javascript
server.on('close', function(agent){

});
```
agent including two properties:
- **source** One of [sources](#sources).
- **event** The original event.

This event is very important, and you can use `agent.source` to identify who emitted `'close'` event, it could be one of [sources](#sources). If it is `'tcp_server'` or `'database'`, it means server or database has just crashed, you'd better restart your server. If you are using `pm2`, just exist the process then `pm2` will auto restart your server:
```javascript
server.on('close', function(agent){
  if(agent.source == multiAgent.Server.source.TCP_SERVER || agent.source == multiAgent.Server.source.DATABASE){
    process.exit(0);
    return;
  }
  // tcp_client closed? screw it.
});
```
#### Methods
##### start
Just start the server, if `autostart` is set to `true`, this effects nothing.
```javascript
server.start();
```

##### stop
If current `state` equals `multiAgent.Server.state.RUNNING`, stops the server.
**Notes:** The server is finally closed when all connections are ended and the server emits a `'close'` event. So, if you really wanna shut down the server, just try `process.exit(0)`.
```javascript
server.stop();
```

#### Properties
##### options
The restructuring options.
```javascript
console.log(server.options);
```

##### state
The current state of server, see more from [states](#states).

##### port
The port of TCP server.

### Client
```javascript
var client = multilevelAgent.Client([options]);
```
The `options` could have below properties:
- **host** The host of TCP server(**required**).
- **port** The port of TCP server which client connects to.
- **manifest** See [multilevel.client([manifest])](https://github.com/juliangruber/multilevel#var-db--multilevelclientmanifest).

#### Example
```javascript
var client = multilevelAgent.Client({
  host: 'localhost',
  port: 8090
});
```
See more from `example/client.js`.

#### API
Access multilevel's APIs through `client.db`, e.g.:
```javascript
client.db.put('KEY', 'VALUE');
client.db.get('KEY', function(err, value){

});
// ...
```

#### Events
##### error
Emitted when an error occurs, e.g.:
```javascript
server.on('error', function(err){

});
```
The `err` is an instance of `Error`, and in addition, `err` has one more property `err.source`, see more from [sources](#sources).

##### connect
Emitted when a new TCP connection or Database is made, e.g.:
```javascript
server.on('connect', function(){

});
```

##### reconnecting
Emitted when reconnecting to datababase/tcp server, e.g.:
```javascript
client.on('reconnecting', function(recon){

})

```
The `reconn` indluding two properties:
- **attempts** The attempts number that CLIENT has tried reconnect to server.
- **delay** The next retry delay(milliseconds).

#### Properties
##### options
The restructuring options.
```javascript
console.log(server.options);
```

##### state
The current state of server, see more from [states](#states).

## Sources
### Server
- **'database'** equals `multiAgent.Server.source.DATABASE`.
- **'tcp_client'** equals `multiAgent.Server.source.TCP_CLIENT`.
- **'tcp_server'** equals `multiAgent.Server.source.TCP_SERVER`.
- **'level_server'** equals `multiAgent.Server.source.LEVEL_SERVER`.

### Client
- **'database'** equals `multiAgent.Client.source.DATABASE`.
- **'tcp_client'** equals `multiAgent.Client.source.TCP_CLIENT`.
- **'rpc_stream'** equals `multiAgent.Client.source.RPC_STREAM`.
- **'level_server'** equals `multiAgent.Client.source.LEVEL_SERVER`.

## States
### Server
- **'init'** equals `multiAgent.Server.state.INIT`.
- **'running'** equals `multiAgent.Server.state.RUNNING`.
- **'stop'** equals `multiAgent.Server.state.STOP`.

### Client
- **'init'** equals `multiAgent.Client.state.INIT`.
- **'running'** equals `multiAgent.Client.state.RUNNING`.
- **'stop'** equals `multiAgent.Client.state.STOP`.


## Test
Only test `options`.
```
npm test
```

Manual test:
- *First:* start server

  ```javascript
  node example/server
  ```

- *Second:* run client

  ```javascript
  node example/client
  ```

If you wanna make different tests, just edit the scripts under example folder.


## License
Copyright 2014 Tjatse

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.



