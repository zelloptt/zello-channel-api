class DomUtils {

  static getElementsByClassName(className, parent = null) {
    if (!parent && document) {
      parent = document;
    }
    try {
      return parent.getElementsByClassName(className);
    } catch (e) {
      return null;
    }
  }

  static getElementByClassName(className, parent = null) {
    if (!parent && document) {
      parent = document;
    }
    try {
      return parent.getElementsByClassName(className)[0];
    } catch (e) {
      return null;
    }
  }

  static getClasses(element) {
    if (!element) {
      return false;
    }
    return element.className.split(/\s+/);
  }

  static hasClass(element, className) {
    if (!element) {
      return false;
    }
    let classes = DomUtils.getClasses(element);
    return classes.indexOf(className) !== -1;
  }

  static addClass(element, className) {
    if (!element) {
      return false;
    }
    if (DomUtils.hasClass(element, className)) {
      return;
    }
    return element.className += ' ' + className;
  }

  static setClasses(element, classNames) {
    if (!element) {
      return false;
    }
    element.className = classNames.join(' ');
  }

  static removeClass(element, className) {
    if (!element) {
      return false;
    }
    element.className = element.className.replace(new RegExp('( |^)' + className + '( |$)'), "$1$2")
  }

  static isDomElement(obj) {
    try {
      return obj instanceof HTMLElement;
    }
    catch (e) {
      return (typeof obj === "object") &&
        (obj.nodeType === 1) && (typeof obj.style === "object") &&
        (typeof obj.ownerDocument === "object");
    }
  }
}

module.exports = DomUtils;