var session = null;
var streamId = null;


describe('session', function() {
  it('wrong password should fail to login', function(done) {
    session = globals.createSessionAWrongPassword();
    session.connect(function(err, result) {
      chai.expect(err).to.not.be.null;
      done();
    });
  });

  it('correct password should login', function(done) {
    session = globals.createSessionA();
    session.connect(function(err, result) {
      chai.expect(err).to.be.null;
      chai.expect(result.success).to.be.true;
      session.disconnect();
      done();
    });
  });

  it('should get status update', function(done) {
    session = globals.createSessionA();
    session.on('status', function(result) {
      chai.expect(result.status).to.equal('online');
      session.disconnect();
      done();
    });
    session.connect();
  });

  it('should fail to start stream with wrong params', function(done) {
    session = globals.createSessionA();
    session.on('status', function(result) {
      chai.expect(result.status).to.equal('online');
      session.startStream({}, function(err) {
        chai.expect(err).to.not.be.null;
        done();
      });
    });
    session.connect();
  });

  it('should start stream with correct params', function(done) {
    session.startStream({
      "command": "start_stream",
      "seq": 1,
      "type": "audio",
      "codec": "opus",
      "codec_header": "gD4BPA==",
      "packet_duration": 200
    }, function(err, result) {
      chai.expect(err).to.be.null;
      chai.expect(result.success).to.be.true;
      chai.expect(typeof result.stream_id).to.equal('number');
      streamId = result.stream_id;
      done();
    })
  });

  it('should fail to stop stream with wrong params', function(done) {
    session.stopStream({}, function(err) {
      chai.expect(err).to.not.be.null;
      done();
    });
  });

  it('should stop stream with correct params', function(done) {
    session.stopStream({
      stream_id: streamId
    }, function(err, result) {
      chai.expect(err).to.be.null;
      chai.expect(result.success).to.be.true;
      session.disconnect();
      done();
    });
  });

});