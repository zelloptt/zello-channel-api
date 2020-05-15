!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.IncomingImage=t():(e.ZCC=e.ZCC||{},e.ZCC.IncomingImage=t())}(window,function(){return function(e){var t={};function n(i){if(t[i])return t[i].exports;var r=t[i]={i:i,l:!1,exports:{}};return e[i].call(r.exports,r,r.exports,n),r.l=!0,r.exports}return n.m=e,n.c=t,n.d=function(e,t,i){n.o(e,t)||Object.defineProperty(e,t,{configurable:!1,enumerable:!0,get:i})},n.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=22)}({0:function(e,t){var n,i,r=e.exports={};function s(){throw new Error("setTimeout has not been defined")}function o(){throw new Error("clearTimeout has not been defined")}function l(e){if(n===setTimeout)return setTimeout(e,0);if((n===s||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:s}catch(e){n=s}try{i="function"==typeof clearTimeout?clearTimeout:o}catch(e){i=o}}();var a,c=[],_=!1,h=-1;function u(){_&&a&&(_=!1,a.length?c=a.concat(c):h=-1,c.length&&f())}function f(){if(!_){var e=l(u);_=!0;for(var t=c.length;t;){for(a=c,c=[];++h<t;)a&&a[h].run();h=-1,t=c.length}a=null,_=!1,function(e){if(i===clearTimeout)return clearTimeout(e);if((i===o||!i)&&clearTimeout)return i=clearTimeout,clearTimeout(e);try{i(e)}catch(t){try{return i.call(null,e)}catch(t){return i.call(this,e)}}}(e)}}function p(e,t){this.fun=e,this.array=t}function E(){}r.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];c.push(new p(e,t)),1!==c.length||_||l(f)},p.prototype.run=function(){this.fun.apply(null,this.array)},r.title="browser",r.browser=!0,r.env={},r.argv=[],r.version="",r.versions={},r.on=E,r.addListener=E,r.once=E,r.off=E,r.removeListener=E,r.removeAllListeners=E,r.emit=E,r.prependListener=E,r.prependOnceListener=E,r.listeners=function(e){return[]},r.binding=function(e){throw new Error("process.binding is not supported")},r.cwd=function(){return"/"},r.chdir=function(e){throw new Error("process.chdir is not supported")},r.umask=function(){return 0}},2:function(e,t,n){"use strict";e.exports={ERROR_NOT_ENOUGH_PARAMS:"Not enough parameters",ERROR_INVALID_SERVER_PROTOCOL:"Invalid server protocol, use ws:// or wss://",ERROR_UNSUPPORTED:"Your browser does not support all required APIs.\nRead more here https://github.com/zelloptt/zello-channel-api",ERROR_RECORDING_NO_HTTPS:"Recording will work over https:// loaded pages only",ERROR_WIDGET_ELEMENT_NOT_FOUND:"DOM element for widget is not found",ERROR_INVALID_DECODER:"Invalid incoming message decoder. Should implement ZCC.Decoder interface",ERROR_INVALID_PLAYER:"Invalid incoming message player. Should implement ZCC.Player interface",ERROR_INVALID_RECORDER:"Invalid outgoing message recorder. Should implement ZCC.Recorder interface",ERROR_INVALID_ENCODER:"Invalid outgoing message encoder. Should implement ZCC.Encoder interface",ERROR_SESSION_FAIL_CONNECT:"Failed to connect",ERROR_INVALID_IMAGE_WIDTH_OR_HEIGHT:"Invalid image width or height",ERROR_FAILED_TO_SEND_IMAGE:"Failed to send image",ERROR_IMAGE_NOT_READY_TO_BE_SENT:"Image is not ready to be sent",ERROR_NO_CAMERA_AVAILABLE:"No camera available",ERROR_TYPE_UNKNOWN_SERVER_ERROR:"Unknown server error",ERROR_TYPE_CONFIGURATION:"configuration",EVENT_ERROR:"error",EVENT_CONNECT:"connect",EVENT_CLOSE:"close",EVENT_LOGON:"logon",EVENT_STATUS:"status",EVENT_START_STREAM:"start_stream",EVENT_STOP_STREAM:"stop_stream",EVENT_SESSION_START_CONNECT:"session_start_connect",EVENT_SESSION_CONNECT:"session_connect",EVENT_SESSION_FAIL_CONNECT:"session_fail_connect",EVENT_SESSION_CONNECTION_LOST:"session_connection_lost",EVENT_SESSION_DISCONNECT:"session_disconnect",EVENT_INCOMING_VOICE_WILL_START:"incoming_voice_will_start",EVENT_INCOMING_VOICE_DID_START:"incoming_voice_did_start",EVENT_INCOMING_VOICE_DID_STOP:"incoming_voice_did_stop",EVENT_INCOMING_VOICE_DATA:"incoming_voice_data",EVENT_INCOMING_VOICE_DATA_DECODED:"incoming_voice_data_decoded",EVENT_INCOMING_IMAGE_DATA:"incoming_image_data",EVENT_DATA:"data",EVENT_DATA_ENCODED:"data_encoded",EVENT_RECORDER_READY:"recorder_ready",EVENT_WIDGET_OPEN_BUTTON_CLICK:"widget_open_button_click",EVENT_WIDGET_MUTE:"widget_mute",EVENT_WIDGET_UNMUTE:"widget_unmute",EVENT_WIDGET_SPEAKING_USERNAME_CLICK:"speaking_username_click",EVENT_INCOMING_TEXT_MESSAGE:"incoming_text_message",EVENT_INCOMING_LOCATION:"incoming_location",EVENT_INCOMING_IMAGE:"incoming_image",EVENT_IMAGE_DATA:"image_data",EVENT_THUMBNAIL_DATA:"thumbnail_data",EVENT_IMAGE_PREVIEW_DATA:"image_preview_data",EVENT_THUMBNAIL_PREVIEW_DATA:"thumbnail_preview_data",MAX_OUTGOING_IMAGE_SCALE_PX:1280,OUTGOING_IMAGE_THUMBNAIL_SCALE_PX:90,SN_STATUS_SUCCESS:"success",SN_STATUS_ONLINE:"online",SN_STATUS_OFFLINE:"offline",MESSAGE_TYPE_AUDIO:1,MESSAGE_TYPE_IMAGE:2,MESSAGE_TYPE_JSON:123,IMAGE_TYPE_FULL:1,IMAGE_TYPE_THUMBNAIL:2}},22:function(e,t,n){"use strict";var i=function(){function e(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}return function(t,n,i){return n&&e(t.prototype,n),i&&e(t,i),t}}();var r=n(4),s=n(2),o=function(e){function t(e,n){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t);var i=function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}(this,(t.__proto__||Object.getPrototypeOf(t)).call(this));return i.messageData=e,i.options=Object.assign({},n.options,{messageData:e}),i.instanceId=e.message_id,i.session=n,i.initSessionHandlers(),i.clearHandlersAfterFetches=2,i.numberOfFetches=0,i}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(t,r),i(t,[{key:"initSessionHandlers",value:function(){var e=this;this.incomingImageHandler=function(t){e.numberOfFetches++;var n=t.packetId===s.IMAGE_TYPE_FULL?s.EVENT_IMAGE_DATA:s.EVENT_THUMBNAIL_DATA;e.emit(n,t.messageData),e.numberOfFetches===e.clearHandlersAfterFetches&&e.session.off([s.EVENT_INCOMING_IMAGE_DATA,e.instanceId],e.incomingImageHandler)},this.session.on([s.EVENT_INCOMING_IMAGE_DATA,this.instanceId],this.incomingImageHandler)}}]),t}();e.exports=o},3:function(e,t,n){(function(i){var r;
/*!
 * EventEmitter2
 * https://github.com/hij1nx/EventEmitter2
 *
 * Copyright (c) 2013 hij1nx
 * Licensed under the MIT license.
 */!function(s){var o=Array.isArray?Array.isArray:function(e){return"[object Array]"===Object.prototype.toString.call(e)},l=10;function a(){this._events={},this._conf&&c.call(this,this._conf)}function c(e){e?(this._conf=e,e.delimiter&&(this.delimiter=e.delimiter),this._maxListeners=e.maxListeners!==s?e.maxListeners:l,e.wildcard&&(this.wildcard=e.wildcard),e.newListener&&(this._newListener=e.newListener),e.removeListener&&(this._removeListener=e.removeListener),e.verboseMemoryLeak&&(this.verboseMemoryLeak=e.verboseMemoryLeak),this.wildcard&&(this.listenerTree={})):this._maxListeners=l}function _(e,t){var n="(node) warning: possible EventEmitter memory leak detected. "+e+" listeners added. Use emitter.setMaxListeners() to increase limit.";if(this.verboseMemoryLeak&&(n+=" Event name: "+t+"."),void 0!==i&&i.emitWarning){var r=new Error(n);r.name="MaxListenersExceededWarning",r.emitter=this,r.count=e,i.emitWarning(r)}else console.error(n),console.trace&&console.trace()}function h(e){this._events={},this._newListener=!1,this._removeListener=!1,this.verboseMemoryLeak=!1,c.call(this,e)}function u(e,t,n,i){if(!n)return[];var r,s,o,l,a,c,_,h=[],f=t.length,p=t[i],E=t[i+1];if(i===f&&n._listeners){if("function"==typeof n._listeners)return e&&e.push(n._listeners),[n];for(r=0,s=n._listeners.length;r<s;r++)e&&e.push(n._listeners[r]);return[n]}if("*"===p||"**"===p||n[p]){if("*"===p){for(o in n)"_listeners"!==o&&n.hasOwnProperty(o)&&(h=h.concat(u(e,t,n[o],i+1)));return h}if("**"===p){for(o in(_=i+1===f||i+2===f&&"*"===E)&&n._listeners&&(h=h.concat(u(e,t,n,f))),n)"_listeners"!==o&&n.hasOwnProperty(o)&&("*"===o||"**"===o?(n[o]._listeners&&!_&&(h=h.concat(u(e,t,n[o],f))),h=h.concat(u(e,t,n[o],i))):h=o===E?h.concat(u(e,t,n[o],i+2)):h.concat(u(e,t,n[o],i)));return h}h=h.concat(u(e,t,n[p],i+1))}if((l=n["*"])&&u(e,t,l,i+1),a=n["**"])if(i<f)for(o in a._listeners&&u(e,t,a,f),a)"_listeners"!==o&&a.hasOwnProperty(o)&&(o===E?u(e,t,a[o],i+2):o===p?u(e,t,a[o],i+1):((c={})[o]=a[o],u(e,t,{"**":c},i+1)));else a._listeners?u(e,t,a,f):a["*"]&&a["*"]._listeners&&u(e,t,a["*"],f);return h}h.EventEmitter2=h,h.prototype.delimiter=".",h.prototype.setMaxListeners=function(e){e!==s&&(this._maxListeners=e,this._conf||(this._conf={}),this._conf.maxListeners=e)},h.prototype.event="",h.prototype.once=function(e,t){return this._once(e,t,!1)},h.prototype.prependOnceListener=function(e,t){return this._once(e,t,!0)},h.prototype._once=function(e,t,n){return this._many(e,1,t,n),this},h.prototype.many=function(e,t,n){return this._many(e,t,n,!1)},h.prototype.prependMany=function(e,t,n){return this._many(e,t,n,!0)},h.prototype._many=function(e,t,n,i){var r=this;if("function"!=typeof n)throw new Error("many only accepts instances of Function");function s(){return 0==--t&&r.off(e,s),n.apply(this,arguments)}return s._origin=n,this._on(e,s,i),r},h.prototype.emit=function(){this._events||a.call(this);var e=arguments[0];if("newListener"===e&&!this._newListener&&!this._events.newListener)return!1;var t,n,i,r,s,o=arguments.length;if(this._all&&this._all.length){if(s=this._all.slice(),o>3)for(t=new Array(o),r=0;r<o;r++)t[r]=arguments[r];for(i=0,n=s.length;i<n;i++)switch(this.event=e,o){case 1:s[i].call(this,e);break;case 2:s[i].call(this,e,arguments[1]);break;case 3:s[i].call(this,e,arguments[1],arguments[2]);break;default:s[i].apply(this,t)}}if(this.wildcard){s=[];var l="string"==typeof e?e.split(this.delimiter):e.slice();u.call(this,s,l,this.listenerTree,0)}else{if("function"==typeof(s=this._events[e])){switch(this.event=e,o){case 1:s.call(this);break;case 2:s.call(this,arguments[1]);break;case 3:s.call(this,arguments[1],arguments[2]);break;default:for(t=new Array(o-1),r=1;r<o;r++)t[r-1]=arguments[r];s.apply(this,t)}return!0}s&&(s=s.slice())}if(s&&s.length){if(o>3)for(t=new Array(o-1),r=1;r<o;r++)t[r-1]=arguments[r];for(i=0,n=s.length;i<n;i++)switch(this.event=e,o){case 1:s[i].call(this);break;case 2:s[i].call(this,arguments[1]);break;case 3:s[i].call(this,arguments[1],arguments[2]);break;default:s[i].apply(this,t)}return!0}if(!this._all&&"error"===e)throw arguments[1]instanceof Error?arguments[1]:new Error("Uncaught, unspecified 'error' event.");return!!this._all},h.prototype.emitAsync=function(){this._events||a.call(this);var e=arguments[0];if("newListener"===e&&!this._newListener&&!this._events.newListener)return Promise.resolve([!1]);var t,n,i,r,s,o=[],l=arguments.length;if(this._all){if(l>3)for(t=new Array(l),r=1;r<l;r++)t[r]=arguments[r];for(i=0,n=this._all.length;i<n;i++)switch(this.event=e,l){case 1:o.push(this._all[i].call(this,e));break;case 2:o.push(this._all[i].call(this,e,arguments[1]));break;case 3:o.push(this._all[i].call(this,e,arguments[1],arguments[2]));break;default:o.push(this._all[i].apply(this,t))}}if(this.wildcard){s=[];var c="string"==typeof e?e.split(this.delimiter):e.slice();u.call(this,s,c,this.listenerTree,0)}else s=this._events[e];if("function"==typeof s)switch(this.event=e,l){case 1:o.push(s.call(this));break;case 2:o.push(s.call(this,arguments[1]));break;case 3:o.push(s.call(this,arguments[1],arguments[2]));break;default:for(t=new Array(l-1),r=1;r<l;r++)t[r-1]=arguments[r];o.push(s.apply(this,t))}else if(s&&s.length){if(s=s.slice(),l>3)for(t=new Array(l-1),r=1;r<l;r++)t[r-1]=arguments[r];for(i=0,n=s.length;i<n;i++)switch(this.event=e,l){case 1:o.push(s[i].call(this));break;case 2:o.push(s[i].call(this,arguments[1]));break;case 3:o.push(s[i].call(this,arguments[1],arguments[2]));break;default:o.push(s[i].apply(this,t))}}else if(!this._all&&"error"===e)return arguments[1]instanceof Error?Promise.reject(arguments[1]):Promise.reject("Uncaught, unspecified 'error' event.");return Promise.all(o)},h.prototype.on=function(e,t){return this._on(e,t,!1)},h.prototype.prependListener=function(e,t){return this._on(e,t,!0)},h.prototype.onAny=function(e){return this._onAny(e,!1)},h.prototype.prependAny=function(e){return this._onAny(e,!0)},h.prototype.addListener=h.prototype.on,h.prototype._onAny=function(e,t){if("function"!=typeof e)throw new Error("onAny only accepts instances of Function");return this._all||(this._all=[]),t?this._all.unshift(e):this._all.push(e),this},h.prototype._on=function(e,t,n){if("function"==typeof e)return this._onAny(e,t),this;if("function"!=typeof t)throw new Error("on only accepts instances of Function");return this._events||a.call(this),this._newListener&&this.emit("newListener",e,t),this.wildcard?(function(e,t){for(var n=0,i=(e="string"==typeof e?e.split(this.delimiter):e.slice()).length;n+1<i;n++)if("**"===e[n]&&"**"===e[n+1])return;for(var r=this.listenerTree,o=e.shift();o!==s;){if(r[o]||(r[o]={}),r=r[o],0===e.length)return r._listeners?("function"==typeof r._listeners&&(r._listeners=[r._listeners]),r._listeners.push(t),!r._listeners.warned&&this._maxListeners>0&&r._listeners.length>this._maxListeners&&(r._listeners.warned=!0,_.call(this,r._listeners.length,o))):r._listeners=t,!0;o=e.shift()}return!0}.call(this,e,t),this):(this._events[e]?("function"==typeof this._events[e]&&(this._events[e]=[this._events[e]]),n?this._events[e].unshift(t):this._events[e].push(t),!this._events[e].warned&&this._maxListeners>0&&this._events[e].length>this._maxListeners&&(this._events[e].warned=!0,_.call(this,this._events[e].length,e))):this._events[e]=t,this)},h.prototype.off=function(e,t){if("function"!=typeof t)throw new Error("removeListener only takes instances of Function");var n,i=[];if(this.wildcard){var r="string"==typeof e?e.split(this.delimiter):e.slice();i=u.call(this,null,r,this.listenerTree,0)}else{if(!this._events[e])return this;n=this._events[e],i.push({_listeners:n})}for(var l=0;l<i.length;l++){var a=i[l];if(n=a._listeners,o(n)){for(var c=-1,_=0,h=n.length;_<h;_++)if(n[_]===t||n[_].listener&&n[_].listener===t||n[_]._origin&&n[_]._origin===t){c=_;break}if(c<0)continue;return this.wildcard?a._listeners.splice(c,1):this._events[e].splice(c,1),0===n.length&&(this.wildcard?delete a._listeners:delete this._events[e]),this._removeListener&&this.emit("removeListener",e,t),this}(n===t||n.listener&&n.listener===t||n._origin&&n._origin===t)&&(this.wildcard?delete a._listeners:delete this._events[e],this._removeListener&&this.emit("removeListener",e,t))}return function e(t){if(t!==s){var n=Object.keys(t);for(var i in n){var r=n[i],o=t[r];o instanceof Function||"object"!=typeof o||null===o||(Object.keys(o).length>0&&e(t[r]),0===Object.keys(o).length&&delete t[r])}}}(this.listenerTree),this},h.prototype.offAny=function(e){var t,n=0,i=0;if(e&&this._all&&this._all.length>0){for(n=0,i=(t=this._all).length;n<i;n++)if(e===t[n])return t.splice(n,1),this._removeListener&&this.emit("removeListenerAny",e),this}else{if(t=this._all,this._removeListener)for(n=0,i=t.length;n<i;n++)this.emit("removeListenerAny",t[n]);this._all=[]}return this},h.prototype.removeListener=h.prototype.off,h.prototype.removeAllListeners=function(e){if(e===s)return!this._events||a.call(this),this;if(this.wildcard)for(var t="string"==typeof e?e.split(this.delimiter):e.slice(),n=u.call(this,null,t,this.listenerTree,0),i=0;i<n.length;i++){n[i]._listeners=null}else this._events&&(this._events[e]=null);return this},h.prototype.listeners=function(e){if(this.wildcard){var t=[],n="string"==typeof e?e.split(this.delimiter):e.slice();return u.call(this,t,n,this.listenerTree,0),t}return this._events||a.call(this),this._events[e]||(this._events[e]=[]),o(this._events[e])||(this._events[e]=[this._events[e]]),this._events[e]},h.prototype.eventNames=function(){return Object.keys(this._events)},h.prototype.listenerCount=function(e){return this.listeners(e).length},h.prototype.listenersAny=function(){return this._all?this._all:[]},(r=function(){return h}.call(t,n,t,e))===s||(e.exports=r)}()}).call(this,n(0))},4:function(e,t,n){"use strict";var i=function(){function e(e,t){for(var n=0;n<t.length;n++){var i=t[n];i.enumerable=i.enumerable||!1,i.configurable=!0,"value"in i&&(i.writable=!0),Object.defineProperty(e,i.key,i)}}return function(t,n,i){return n&&e(t.prototype,n),i&&e(t,i),t}}(),r=function e(t,n,i){null===t&&(t=Function.prototype);var r=Object.getOwnPropertyDescriptor(t,n);if(void 0===r){var s=Object.getPrototypeOf(t);return null===s?void 0:e(s,n,i)}if("value"in r)return r.value;var o=r.get;return void 0!==o?o.call(i):void 0};var s=n(3).EventEmitter2,o=function(e){function t(){return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,{wildcard:!0}))}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(t,s),i(t,[{key:"emit",value:function(){r(t.prototype.__proto__||Object.getPrototypeOf(t.prototype),"emit",this).apply(this,arguments);var e=arguments[0];e instanceof Array&&e.length>1||"string"==typeof e&&-1!==e.indexOf(".")||(arguments[0]=(arguments[0]instanceof Array?arguments[0][0]:arguments[0])+".*",r(t.prototype.__proto__||Object.getPrototypeOf(t.prototype),"emit",this).apply(this,arguments))}}]),t}();e.exports=o}})});
//# sourceMappingURL=zcc.incomingimage.js.map