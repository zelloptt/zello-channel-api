const settings = require('./../../settings');

class Utils {
  static getLoadedLibrary() {
    if (!window) {
      return false;
    }
    return window[settings.libraryName];
  }
}
module.exports = Utils;