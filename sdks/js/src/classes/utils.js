const settings = require('./../../settings');

class Utils {
  static getLoadedLibrary() {
    if (!window) {
      return false;
    }
    return window[settings.libraryName];
  }

  static strToCamelCase(str) {
    return str.split(/[-_]/).map((a, b) => {
      return b === 0 ? a.toLowerCase() : a.charAt(0).toUpperCase() + a.slice(1).toLowerCase()
    }).join('');
  }
}

module.exports = Utils;