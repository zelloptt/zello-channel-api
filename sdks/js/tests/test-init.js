describe('init', function() {

  it('recorder cannot be used over https', function() {
    if (document.location.protocol === 'http:') {
      chai.expect(function() {
        ZCC.Sdk.init({
          recorder: true,
          player: true,
          widget: {
            headless: true,
            autoInit: true
          }
        });
      }).to.throw();
    } else {
      chai.expect(function() {
        ZCC.Sdk.init({
          recorder: true,
          player: true,
          widget: {
            headless: true,
            autoInit: true
          }
        });
      }).not.to.throw();
    }
  });


  it('sdk init', function(done) {
    ZCC.Sdk.init({
      recorder: false,
      player: true,
      widget: {
        headless: true,
        autoInit: true
      }
    }, function() {
      chai.expect(typeof ZCC.Sdk).to.equal('function');
      chai.expect(typeof ZCC.Session).to.equal('function');
      chai.expect(typeof ZCC.Widget).to.equal('function');
      chai.expect(typeof ZCC.Player).to.equal('object');
      chai.expect(typeof ZCC.Player.Decoder).to.equal('object');
      chai.expect(typeof ZCC.Player.Decoder.OpusToPCM).to.equal('function');
      chai.expect(typeof ZCC.Player.PCMPlayer).to.equal('function');
      done();
    });
  });

  it('sdk auto init (should start session and create widget)', function(done) {
    ZCC.Sdk.init({
      recorder: false,
      player: true,
      widget: {
        headless: true,
        autoInit: true
      },
      session: {
        autoInit: true,
        serverUrl: globals.serverUrl,
        authToken: globals.authToken,
        channel: globals.channel,
        username: globals.userA.username,
        password: globals.userA.password,
        onConnect: function(err, result) {
          chai.expect(err).to.be.null;
        },
        onLogon: function(err, result) {
          chai.expect(err).to.be.null;
          chai.expect(result.success).to.be.true;
          chai.expect(ZCC.Sdk.widget).to.be.an.instanceof(ZCC.Widget);
          chai.expect(ZCC.Sdk.session).to.be.an.instanceof(ZCC.Session);
          chai.expect(ZCC.Sdk.widget.session).to.be.an.instanceof(ZCC.Session);
          done();
        }
      }
    });
  })

});