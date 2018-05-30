describe('init', function() {

  it('sdk init', function(done) {
    ZCC.Sdk.init({
      recorder: true,
      player: true,
      widget: true
    }, function() {
      chai.expect(typeof ZCC.Sdk).to.equal('function');
      chai.expect(typeof ZCC.Session).to.equal('function');
      chai.expect(typeof ZCC.Widget).to.equal('function');
      chai.expect(typeof ZCC.Player).to.equal('function');
      chai.expect(typeof ZCC.Decoder).to.equal('function');
      chai.expect(typeof ZCC.Recorder).to.equal('function');
      chai.expect(typeof ZCC.Encoder).to.equal('function');
      done();
    });
  });

});