var Emitter2 = require('eventemitter2').EventEmitter2;

class Emitter extends Emitter2 {
  constructor() {
    super({wildcard: true});
  }

  /**
   * override emit to emit global with star so that namespaced handlers fire
   * */
  emit() {
    // regular emit
    super.emit.apply(this, arguments);

    let originalEvent = arguments[0];
    if (
      originalEvent instanceof Array && originalEvent.length > 1 ||
      typeof originalEvent === 'string' && originalEvent.indexOf(".") !== -1
    ) {
      return;
    }
    arguments[0] = (arguments[0] instanceof Array ? arguments[0][0] : arguments[0]) + '.*';
    super.emit.apply(this, arguments);
  }

}

module.exports = Emitter;