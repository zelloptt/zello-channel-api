var session = null;
var widget = null;

describe('widget', function() {
  it('should fail to init without DOM element to bind', function() {
    chai.expect(function() {
      ZCC.Sdk.init({
        recorder: false,
        player: true,
        widget: {
          headless: false,
          autoInit: true,
          element: document.getElementById('non-existent-element')
        }
      })
    }).to.throw('DOM element for widget is not found');
  });

  it('should init with existing DOM element', function() {
    chai.expect(function() {
      ZCC.Sdk.init({
        recorder: false,
        player: true,
        widget: {
          headless: false,
          autoInit: true,
          element: document.getElementById('playerA')
        }
      });
    }).to.not.throw();
  });

  it('should link session with widget', function(done) {
    session = globals.createSessionA();
    ZCC.Sdk.widget.setSession(session);
    session.connect(function() {
      session.logon(function() {
        var widgetElement = $(ZCC.Sdk.widget.element);
        console.warn(widgetElement.find('.zcc-button'));
        done();
      })
    })
  })

});