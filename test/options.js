var chai = require('chai'),
  expect = chai.expect,
  should = chai.should(),
  multiAgent = require('../');

describe.skip('options', function(){
  describe('of server', function(){
    it('should throws an error when `location` was undefined', function(){
      var error;
      try{
        var server = multiAgent.Server();
      }catch(err){
        error = err;
      }
      should.exist(error);
    });
    it('should works fine when `location` was provided', function(){
      var error;
      try{
        var server = multiAgent.Server({
          location: __dirname + '/db'
        });
      }catch(err){
        error = err;
      }
      should.not.exist(error);
    });

    it('`port` should be 8081 if it was undefined', function(){
      var server = multiAgent.Server({
        location: __dirname + '/db'
      });
      expect(server.options.port).to.be.equals(8081);
    });
    it('`port` can be customized', function(){
      var server = multiAgent.Server({
        location: __dirname + '/db',
        port: 9091
      });
      expect(server.options.port).to.be.equals(9091);
    });

    it('`autostart` should be disabled as default', function(){
      var server = multiAgent.Server({
        location: __dirname + '/db'
      });
      expect(server.options.autostart).is.not.ok;
    });
    it('when `autostart` was enabled, server will automatic start ', function(done){
      var server = multiAgent.Server({
        location: __dirname + '/db',
        autostart: true
      });
      expect(server.options.autostart).is.ok;
      expect(server.state).to.equals(multiAgent.Server.state.RUNNING);
      setTimeout(function(){
        server.stop();
        expect(server.state).to.equals(multiAgent.Server.state.STOP);
        done();
      }, 500);
    });
  });

  describe('of client', function(){
    it('should throws an error when `host` was undefined', function(){
      var error;
      try{
        var client = multiAgent.Client();
        client.on('error', function(){});
      }catch(err){
        error = err;
      }
      should.exist(error);
    });
    it('should works fine when `host` was provided', function(){
      var error;
      try{
        var client = multiAgent.Client({
          host: 'localhost'
        });
        client.on('error', function(){});
      }catch(err){
        error = err;
      }
      should.not.exist(error);
    });

    it('`port` should be 8081 if it was undefined', function(){
      var client = multiAgent.Client({
        host: 'localhost'
      });
      client.on('error', function(){});
      expect(client.options.tcp.port).to.be.equals(8081);
    });
    it('`port` can be customized', function(){
      var client = multiAgent.Client({
        host: 'localhost',
        port: 9091
      });
      client.on('error', function(){});
      expect(client.options.tcp.port).to.be.equals(9091);
    });
  });
});