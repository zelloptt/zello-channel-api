!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.IncomingMessage=t():(e.ZCC=e.ZCC||{},e.ZCC.IncomingMessage=t())}(window,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{configurable:!1,enumerable:!0,get:r})},n.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=20)}([function(e,t){var n,r,i=e.exports={};function o(){throw new Error("setTimeout has not been defined")}function s(){throw new Error("clearTimeout has not been defined")}function a(e){if(n===setTimeout)return setTimeout(e,0);if((n===o||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:o}catch(e){n=o}try{r="function"==typeof clearTimeout?clearTimeout:s}catch(e){r=s}}();var c,l=[],u=!1,f=-1;function p(){u&&c&&(u=!1,c.length?l=c.concat(l):f=-1,l.length&&h())}function h(){if(!u){var e=a(p);u=!0;for(var t=l.length;t;){for(c=l,l=[];++f<t;)c&&c[f].run();f=-1,t=l.length}c=null,u=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===s||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e)}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e)}}function _(e,t){this.fun=e,this.array=t}function d(){}i.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];l.push(new _(e,t)),1!==l.length||u||a(h)},_.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=d,i.addListener=d,i.once=d,i.off=d,i.removeListener=d,i.removeAllListeners=d,i.emit=d,i.prependListener=d,i.prependOnceListener=d,i.listeners=function(e){return[]},i.binding=function(e){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(e){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},function(e,t){var n;n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(e){"object"==typeof window&&(n=window)}e.exports=n},function(e,t,n){"use strict";e.exports={ERROR_NOT_ENOUGH_PARAMS:"Not enough parameters",ERROR_INVALID_SERVER_PROTOCOL:"Invalid server protocol, use ws:// or wss://",ERROR_UNSUPPORTED:"Your browser does not support all required APIs.\nRead more here https://github.com/zelloptt/zello-channel-api",ERROR_RECORDING_NO_HTTPS:"Recording will work over https:// loaded pages only",ERROR_WIDGET_ELEMENT_NOT_FOUND:"DOM element for widget is not found",ERROR_INVALID_DECODER:"Invalid incoming message decoder. Should implement ZCC.Decoder interface",ERROR_INVALID_PLAYER:"Invalid incoming message player. Should implement ZCC.Player interface",ERROR_INVALID_RECORDER:"Invalid outgoing message recorder. Should implement ZCC.Recorder interface",ERROR_INVALID_ENCODER:"Invalid outgoing message encoder. Should implement ZCC.Encoder interface",ERROR_SESSION_FAIL_CONNECT:"Failed to connect",ERROR_INVALID_IMAGE_WIDTH_OR_HEIGHT:"Invalid image width or height",ERROR_FAILED_TO_SEND_IMAGE:"Failed to send image",ERROR_IMAGE_NOT_READY_TO_BE_SENT:"Image is not ready to be sent",ERROR_NO_CAMERA_AVAILABLE:"No camera available",ERROR_TYPE_UNKNOWN_SERVER_ERROR:"Unknown server error",ERROR_TYPE_CONFIGURATION:"configuration",ERROR_TYPE_NOT_AUTHORIZED:"not authorized",ERROR_TYPE_INVALID_PASSWORD:"invalid password",ERROR_TYPE_INVALID_USERNAME:"invalid username",EVENT_ERROR:"error",EVENT_CONNECT:"connect",EVENT_CLOSE:"close",EVENT_LOGON:"logon",EVENT_STATUS:"status",EVENT_START_STREAM:"start_stream",EVENT_STOP_STREAM:"stop_stream",EVENT_SESSION_START_CONNECT:"session_start_connect",EVENT_SESSION_CONNECT:"session_connect",EVENT_SESSION_FAIL_CONNECT:"session_fail_connect",EVENT_SESSION_CONNECTION_LOST:"session_connection_lost",EVENT_SESSION_DISCONNECT:"session_disconnect",EVENT_INCOMING_VOICE_WILL_START:"incoming_voice_will_start",EVENT_INCOMING_VOICE_DID_START:"incoming_voice_did_start",EVENT_INCOMING_VOICE_DID_STOP:"incoming_voice_did_stop",EVENT_INCOMING_VOICE_DATA:"incoming_voice_data",EVENT_INCOMING_VOICE_DATA_DECODED:"incoming_voice_data_decoded",EVENT_INCOMING_IMAGE_DATA:"incoming_image_data",EVENT_DATA:"data",EVENT_DATA_ENCODED:"data_encoded",EVENT_ENCODER_DONE:"encoder_done",EVENT_RECORDER_READY:"recorder_ready",EVENT_WIDGET_OPEN_BUTTON_CLICK:"widget_open_button_click",EVENT_WIDGET_MUTE:"widget_mute",EVENT_WIDGET_UNMUTE:"widget_unmute",EVENT_WIDGET_SPEAKING_USERNAME_CLICK:"speaking_username_click",EVENT_INCOMING_TEXT_MESSAGE:"incoming_text_message",EVENT_INCOMING_LOCATION:"incoming_location",EVENT_INCOMING_IMAGE:"incoming_image",EVENT_IMAGE_DATA:"image_data",EVENT_THUMBNAIL_DATA:"thumbnail_data",EVENT_IMAGE_PREVIEW_DATA:"image_preview_data",EVENT_THUMBNAIL_PREVIEW_DATA:"thumbnail_preview_data",MAX_OUTGOING_IMAGE_SCALE_PX:1280,OUTGOING_IMAGE_THUMBNAIL_SCALE_PX:90,SN_STATUS_SUCCESS:"success",SN_STATUS_ONLINE:"online",SN_STATUS_OFFLINE:"offline",MESSAGE_TYPE_AUDIO:1,MESSAGE_TYPE_IMAGE:2,MESSAGE_TYPE_JSON:123,IMAGE_TYPE_FULL:1,IMAGE_TYPE_THUMBNAIL:2}},function(e,t,n){(function(r){var i;!function(o){var s=Array.isArray?Array.isArray:function(e){return"[object Array]"===Object.prototype.toString.call(e)},a=10;function c(){this._events={},this._conf&&l.call(this,this._conf)}function l(e){e?(this._conf=e,e.delimiter&&(this.delimiter=e.delimiter),this._maxListeners=e.maxListeners!==o?e.maxListeners:a,e.wildcard&&(this.wildcard=e.wildcard),e.newListener&&(this._newListener=e.newListener),e.removeListener&&(this._removeListener=e.removeListener),e.verboseMemoryLeak&&(this.verboseMemoryLeak=e.verboseMemoryLeak),this.wildcard&&(this.listenerTree={})):this._maxListeners=a}function u(e,t){var n="(node) warning: possible EventEmitter memory leak detected. "+e+" listeners added. Use emitter.setMaxListeners() to increase limit.";if(this.verboseMemoryLeak&&(n+=" Event name: "+t+"."),void 0!==r&&r.emitWarning){var i=new Error(n);i.name="MaxListenersExceededWarning",i.emitter=this,i.count=e,r.emitWarning(i)}else console.error(n),console.trace&&console.trace()}function f(e){this._events={},this._newListener=!1,this._removeListener=!1,this.verboseMemoryLeak=!1,l.call(this,e)}function p(e,t,n,r){if(!n)return[];var i,o,s,a,c,l,u,f=[],h=t.length,_=t[r],d=t[r+1];if(r===h&&n._listeners){if("function"==typeof n._listeners)return e&&e.push(n._listeners),[n];for(i=0,o=n._listeners.length;i<o;i++)e&&e.push(n._listeners[i]);return[n]}if("*"===_||"**"===_||n[_]){if("*"===_){for(s in n)"_listeners"!==s&&n.hasOwnProperty(s)&&(f=f.concat(p(e,t,n[s],r+1)));return f}if("**"===_){for(s in(u=r+1===h||r+2===h&&"*"===d)&&n._listeners&&(f=f.concat(p(e,t,n,h))),n)"_listeners"!==s&&n.hasOwnProperty(s)&&("*"===s||"**"===s?(n[s]._listeners&&!u&&(f=f.concat(p(e,t,n[s],h))),f=f.concat(p(e,t,n[s],r))):f=s===d?f.concat(p(e,t,n[s],r+2)):f.concat(p(e,t,n[s],r)));return f}f=f.concat(p(e,t,n[_],r+1))}if((a=n["*"])&&p(e,t,a,r+1),c=n["**"])if(r<h)for(s in c._listeners&&p(e,t,c,h),c)"_listeners"!==s&&c.hasOwnProperty(s)&&(s===d?p(e,t,c[s],r+2):s===_?p(e,t,c[s],r+1):((l={})[s]=c[s],p(e,t,{"**":l},r+1)));else c._listeners?p(e,t,c,h):c["*"]&&c["*"]._listeners&&p(e,t,c["*"],h);return f}f.EventEmitter2=f,f.prototype.delimiter=".",f.prototype.setMaxListeners=function(e){e!==o&&(this._maxListeners=e,this._conf||(this._conf={}),this._conf.maxListeners=e)},f.prototype.event="",f.prototype.once=function(e,t){return this._once(e,t,!1)},f.prototype.prependOnceListener=function(e,t){return this._once(e,t,!0)},f.prototype._once=function(e,t,n){return this._many(e,1,t,n),this},f.prototype.many=function(e,t,n){return this._many(e,t,n,!1)},f.prototype.prependMany=function(e,t,n){return this._many(e,t,n,!0)},f.prototype._many=function(e,t,n,r){var i=this;if("function"!=typeof n)throw new Error("many only accepts instances of Function");function o(){return 0==--t&&i.off(e,o),n.apply(this,arguments)}return o._origin=n,this._on(e,o,r),i},f.prototype.emit=function(){this._events||c.call(this);var e=arguments[0];if("newListener"===e&&!this._newListener&&!this._events.newListener)return!1;var t,n,r,i,o,s=arguments.length;if(this._all&&this._all.length){if(o=this._all.slice(),s>3)for(t=new Array(s),i=0;i<s;i++)t[i]=arguments[i];for(r=0,n=o.length;r<n;r++)switch(this.event=e,s){case 1:o[r].call(this,e);break;case 2:o[r].call(this,e,arguments[1]);break;case 3:o[r].call(this,e,arguments[1],arguments[2]);break;default:o[r].apply(this,t)}}if(this.wildcard){o=[];var a="string"==typeof e?e.split(this.delimiter):e.slice();p.call(this,o,a,this.listenerTree,0)}else{if("function"==typeof(o=this._events[e])){switch(this.event=e,s){case 1:o.call(this);break;case 2:o.call(this,arguments[1]);break;case 3:o.call(this,arguments[1],arguments[2]);break;default:for(t=new Array(s-1),i=1;i<s;i++)t[i-1]=arguments[i];o.apply(this,t)}return!0}o&&(o=o.slice())}if(o&&o.length){if(s>3)for(t=new Array(s-1),i=1;i<s;i++)t[i-1]=arguments[i];for(r=0,n=o.length;r<n;r++)switch(this.event=e,s){case 1:o[r].call(this);break;case 2:o[r].call(this,arguments[1]);break;case 3:o[r].call(this,arguments[1],arguments[2]);break;default:o[r].apply(this,t)}return!0}if(!this._all&&"error"===e)throw arguments[1]instanceof Error?arguments[1]:new Error("Uncaught, unspecified 'error' event.");return!!this._all},f.prototype.emitAsync=function(){this._events||c.call(this);var e=arguments[0];if("newListener"===e&&!this._newListener&&!this._events.newListener)return Promise.resolve([!1]);var t,n,r,i,o,s=[],a=arguments.length;if(this._all){if(a>3)for(t=new Array(a),i=1;i<a;i++)t[i]=arguments[i];for(r=0,n=this._all.length;r<n;r++)switch(this.event=e,a){case 1:s.push(this._all[r].call(this,e));break;case 2:s.push(this._all[r].call(this,e,arguments[1]));break;case 3:s.push(this._all[r].call(this,e,arguments[1],arguments[2]));break;default:s.push(this._all[r].apply(this,t))}}if(this.wildcard){o=[];var l="string"==typeof e?e.split(this.delimiter):e.slice();p.call(this,o,l,this.listenerTree,0)}else o=this._events[e];if("function"==typeof o)switch(this.event=e,a){case 1:s.push(o.call(this));break;case 2:s.push(o.call(this,arguments[1]));break;case 3:s.push(o.call(this,arguments[1],arguments[2]));break;default:for(t=new Array(a-1),i=1;i<a;i++)t[i-1]=arguments[i];s.push(o.apply(this,t))}else if(o&&o.length){if(o=o.slice(),a>3)for(t=new Array(a-1),i=1;i<a;i++)t[i-1]=arguments[i];for(r=0,n=o.length;r<n;r++)switch(this.event=e,a){case 1:s.push(o[r].call(this));break;case 2:s.push(o[r].call(this,arguments[1]));break;case 3:s.push(o[r].call(this,arguments[1],arguments[2]));break;default:s.push(o[r].apply(this,t))}}else if(!this._all&&"error"===e)return arguments[1]instanceof Error?Promise.reject(arguments[1]):Promise.reject("Uncaught, unspecified 'error' event.");return Promise.all(s)},f.prototype.on=function(e,t){return this._on(e,t,!1)},f.prototype.prependListener=function(e,t){return this._on(e,t,!0)},f.prototype.onAny=function(e){return this._onAny(e,!1)},f.prototype.prependAny=function(e){return this._onAny(e,!0)},f.prototype.addListener=f.prototype.on,f.prototype._onAny=function(e,t){if("function"!=typeof e)throw new Error("onAny only accepts instances of Function");return this._all||(this._all=[]),t?this._all.unshift(e):this._all.push(e),this},f.prototype._on=function(e,t,n){if("function"==typeof e)return this._onAny(e,t),this;if("function"!=typeof t)throw new Error("on only accepts instances of Function");return this._events||c.call(this),this._newListener&&this.emit("newListener",e,t),this.wildcard?(function(e,t){for(var n=0,r=(e="string"==typeof e?e.split(this.delimiter):e.slice()).length;n+1<r;n++)if("**"===e[n]&&"**"===e[n+1])return;for(var i=this.listenerTree,s=e.shift();s!==o;){if(i[s]||(i[s]={}),i=i[s],0===e.length)return i._listeners?("function"==typeof i._listeners&&(i._listeners=[i._listeners]),i._listeners.push(t),!i._listeners.warned&&this._maxListeners>0&&i._listeners.length>this._maxListeners&&(i._listeners.warned=!0,u.call(this,i._listeners.length,s))):i._listeners=t,!0;s=e.shift()}return!0}.call(this,e,t),this):(this._events[e]?("function"==typeof this._events[e]&&(this._events[e]=[this._events[e]]),n?this._events[e].unshift(t):this._events[e].push(t),!this._events[e].warned&&this._maxListeners>0&&this._events[e].length>this._maxListeners&&(this._events[e].warned=!0,u.call(this,this._events[e].length,e))):this._events[e]=t,this)},f.prototype.off=function(e,t){if("function"!=typeof t)throw new Error("removeListener only takes instances of Function");var n,r=[];if(this.wildcard){var i="string"==typeof e?e.split(this.delimiter):e.slice();r=p.call(this,null,i,this.listenerTree,0)}else{if(!this._events[e])return this;n=this._events[e],r.push({_listeners:n})}for(var a=0;a<r.length;a++){var c=r[a];if(n=c._listeners,s(n)){for(var l=-1,u=0,f=n.length;u<f;u++)if(n[u]===t||n[u].listener&&n[u].listener===t||n[u]._origin&&n[u]._origin===t){l=u;break}if(l<0)continue;return this.wildcard?c._listeners.splice(l,1):this._events[e].splice(l,1),0===n.length&&(this.wildcard?delete c._listeners:delete this._events[e]),this._removeListener&&this.emit("removeListener",e,t),this}(n===t||n.listener&&n.listener===t||n._origin&&n._origin===t)&&(this.wildcard?delete c._listeners:delete this._events[e],this._removeListener&&this.emit("removeListener",e,t))}return function e(t){if(t!==o){var n=Object.keys(t);for(var r in n){var i=n[r],s=t[i];s instanceof Function||"object"!=typeof s||null===s||(Object.keys(s).length>0&&e(t[i]),0===Object.keys(s).length&&delete t[i])}}}(this.listenerTree),this},f.prototype.offAny=function(e){var t,n=0,r=0;if(e&&this._all&&this._all.length>0){for(n=0,r=(t=this._all).length;n<r;n++)if(e===t[n])return t.splice(n,1),this._removeListener&&this.emit("removeListenerAny",e),this}else{if(t=this._all,this._removeListener)for(n=0,r=t.length;n<r;n++)this.emit("removeListenerAny",t[n]);this._all=[]}return this},f.prototype.removeListener=f.prototype.off,f.prototype.removeAllListeners=function(e){if(e===o)return!this._events||c.call(this),this;if(this.wildcard)for(var t="string"==typeof e?e.split(this.delimiter):e.slice(),n=p.call(this,null,t,this.listenerTree,0),r=0;r<n.length;r++)n[r]._listeners=null;else this._events&&(this._events[e]=null);return this},f.prototype.listeners=function(e){if(this.wildcard){var t=[],n="string"==typeof e?e.split(this.delimiter):e.slice();return p.call(this,t,n,this.listenerTree,0),t}return this._events||c.call(this),this._events[e]||(this._events[e]=[]),s(this._events[e])||(this._events[e]=[this._events[e]]),this._events[e]},f.prototype.eventNames=function(){return Object.keys(this._events)},f.prototype.listenerCount=function(e){return this.listeners(e).length},f.prototype.listenersAny=function(){return this._all?this._all:[]},(i=function(){return f}.call(t,n,t,e))===o||(e.exports=i)}()}).call(this,n(0))},function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),i=function e(t,n,r){null===t&&(t=Function.prototype);var i=Object.getOwnPropertyDescriptor(t,n);if(void 0===i){var o=Object.getPrototypeOf(t);return null===o?void 0:e(o,n,r)}if("value"in i)return i.value;var s=i.get;return void 0!==s?s.call(r):void 0},o=n(3).EventEmitter2,s=function(e){function t(){return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,{wildcard:!0}))}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(t,o),r(t,[{key:"emit",value:function(){i(t.prototype.__proto__||Object.getPrototypeOf(t.prototype),"emit",this).apply(this,arguments);var e=arguments[0];e instanceof Array&&e.length>1||"string"==typeof e&&-1!==e.indexOf(".")||(arguments[0]=(arguments[0]instanceof Array?arguments[0][0]:arguments[0])+".*",i(t.prototype.__proto__||Object.getPrototypeOf(t.prototype),"emit",this).apply(this,arguments))}}]),t}();e.exports=s},function(e,t){"function"==typeof Object.create?e.exports=function(e,t){e.super_=t,e.prototype=Object.create(t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}})}:e.exports=function(e,t){e.super_=t;var n=function(){};n.prototype=t.prototype,e.prototype=new n,e.prototype.constructor=e}},function(e,t){e.exports=function(e){return e&&"object"==typeof e&&"function"==typeof e.copy&&"function"==typeof e.fill&&"function"==typeof e.readUInt8}},function(e,t,n){(function(e,r){var i=/%[sdj%]/g;t.format=function(e){if(!E(e)){for(var t=[],n=0;n<arguments.length;n++)t.push(a(arguments[n]));return t.join(" ")}n=1;for(var r=arguments,o=r.length,s=String(e).replace(i,function(e){if("%%"===e)return"%";if(n>=o)return e;switch(e){case"%s":return String(r[n++]);case"%d":return Number(r[n++]);case"%j":try{return JSON.stringify(r[n++])}catch(e){return"[Circular]"}default:return e}}),c=r[n];n<o;c=r[++n])d(c)||!m(c)?s+=" "+c:s+=" "+a(c);return s},t.deprecate=function(n,i){if(g(e.process))return function(){return t.deprecate(n,i).apply(this,arguments)};if(!0===r.noDeprecation)return n;var o=!1;return function(){if(!o){if(r.throwDeprecation)throw new Error(i);r.traceDeprecation?console.trace(i):console.error(i),o=!0}return n.apply(this,arguments)}};var o,s={};function a(e,n){var r={seen:[],stylize:l};return arguments.length>=3&&(r.depth=arguments[2]),arguments.length>=4&&(r.colors=arguments[3]),_(n)?r.showHidden=n:n&&t._extend(r,n),g(r.showHidden)&&(r.showHidden=!1),g(r.depth)&&(r.depth=2),g(r.colors)&&(r.colors=!1),g(r.customInspect)&&(r.customInspect=!0),r.colors&&(r.stylize=c),u(r,e,r.depth)}function c(e,t){var n=a.styles[t];return n?"["+a.colors[n][0]+"m"+e+"["+a.colors[n][1]+"m":e}function l(e,t){return e}function u(e,n,r){if(e.customInspect&&n&&w(n.inspect)&&n.inspect!==t.inspect&&(!n.constructor||n.constructor.prototype!==n)){var i=n.inspect(r,e);return E(i)||(i=u(e,i,r)),i}var o=function(e,t){if(g(t))return e.stylize("undefined","undefined");if(E(t)){var n="'"+JSON.stringify(t).replace(/^"|"$/g,"").replace(/'/g,"\\'").replace(/\\"/g,'"')+"'";return e.stylize(n,"string")}return y(t)?e.stylize(""+t,"number"):_(t)?e.stylize(""+t,"boolean"):d(t)?e.stylize("null","null"):void 0}(e,n);if(o)return o;var s=Object.keys(n),a=function(e){var t={};return s.forEach(function(e,n){t[e]=!0}),t}();if(e.showHidden&&(s=Object.getOwnPropertyNames(n)),b(n)&&(s.indexOf("message")>=0||s.indexOf("description")>=0))return f(n);if(0===s.length){if(w(n)){var c=n.name?": "+n.name:"";return e.stylize("[Function"+c+"]","special")}if(v(n))return e.stylize(RegExp.prototype.toString.call(n),"regexp");if(O(n))return e.stylize(Date.prototype.toString.call(n),"date");if(b(n))return f(n)}var l,m="",T=!1,N=["{","}"];return h(n)&&(T=!0,N=["[","]"]),w(n)&&(m=" [Function"+(n.name?": "+n.name:"")+"]"),v(n)&&(m=" "+RegExp.prototype.toString.call(n)),O(n)&&(m=" "+Date.prototype.toUTCString.call(n)),b(n)&&(m=" "+f(n)),0!==s.length||T&&0!=n.length?r<0?v(n)?e.stylize(RegExp.prototype.toString.call(n),"regexp"):e.stylize("[Object]","special"):(e.seen.push(n),l=T?function(e,t,n,r,i){for(var o=[],s=0,a=t.length;s<a;++s)I(t,String(s))?o.push(p(e,t,n,r,String(s),!0)):o.push("");return i.forEach(function(i){i.match(/^\d+$/)||o.push(p(e,t,n,r,i,!0))}),o}(e,n,r,a,s):s.map(function(t){return p(e,n,r,a,t,T)}),e.seen.pop(),function(e,t,n){return e.reduce(function(e,t){return t.indexOf("\n"),e+t.replace(/\u001b\[\d\d?m/g,"").length+1},0)>60?n[0]+(""===t?"":t+"\n ")+" "+e.join(",\n  ")+" "+n[1]:n[0]+t+" "+e.join(", ")+" "+n[1]}(l,m,N)):N[0]+m+N[1]}function f(e){return"["+Error.prototype.toString.call(e)+"]"}function p(e,t,n,r,i,o){var s,a,c;if((c=Object.getOwnPropertyDescriptor(t,i)||{value:t[i]}).get?a=c.set?e.stylize("[Getter/Setter]","special"):e.stylize("[Getter]","special"):c.set&&(a=e.stylize("[Setter]","special")),I(r,i)||(s="["+i+"]"),a||(e.seen.indexOf(c.value)<0?(a=d(n)?u(e,c.value,null):u(e,c.value,n-1)).indexOf("\n")>-1&&(a=o?a.split("\n").map(function(e){return"  "+e}).join("\n").substr(2):"\n"+a.split("\n").map(function(e){return"   "+e}).join("\n")):a=e.stylize("[Circular]","special")),g(s)){if(o&&i.match(/^\d+$/))return a;(s=JSON.stringify(""+i)).match(/^"([a-zA-Z_][a-zA-Z_0-9]*)"$/)?(s=s.substr(1,s.length-2),s=e.stylize(s,"name")):(s=s.replace(/'/g,"\\'").replace(/\\"/g,'"').replace(/(^"|"$)/g,"'"),s=e.stylize(s,"string"))}return s+": "+a}function h(e){return Array.isArray(e)}function _(e){return"boolean"==typeof e}function d(e){return null===e}function y(e){return"number"==typeof e}function E(e){return"string"==typeof e}function g(e){return void 0===e}function v(e){return m(e)&&"[object RegExp]"===T(e)}function m(e){return"object"==typeof e&&null!==e}function O(e){return m(e)&&"[object Date]"===T(e)}function b(e){return m(e)&&("[object Error]"===T(e)||e instanceof Error)}function w(e){return"function"==typeof e}function T(e){return Object.prototype.toString.call(e)}function N(e){return e<10?"0"+e.toString(10):e.toString(10)}t.debuglog=function(e){if(g(o)&&(o=r.env.NODE_DEBUG||""),e=e.toUpperCase(),!s[e])if(new RegExp("\\b"+e+"\\b","i").test(o)){var n=r.pid;s[e]=function(){var r=t.format.apply(t,arguments);console.error("%s %d: %s",e,n,r)}}else s[e]=function(){};return s[e]},t.inspect=a,a.colors={bold:[1,22],italic:[3,23],underline:[4,24],inverse:[7,27],white:[37,39],grey:[90,39],black:[30,39],blue:[34,39],cyan:[36,39],green:[32,39],magenta:[35,39],red:[31,39],yellow:[33,39]},a.styles={special:"cyan",number:"yellow",boolean:"yellow",undefined:"grey",null:"bold",string:"green",date:"magenta",regexp:"red"},t.isArray=h,t.isBoolean=_,t.isNull=d,t.isNullOrUndefined=function(e){return null==e},t.isNumber=y,t.isString=E,t.isSymbol=function(e){return"symbol"==typeof e},t.isUndefined=g,t.isRegExp=v,t.isObject=m,t.isDate=O,t.isError=b,t.isFunction=w,t.isPrimitive=function(e){return null===e||"boolean"==typeof e||"number"==typeof e||"string"==typeof e||"symbol"==typeof e||void 0===e},t.isBuffer=n(6);var A=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];function I(e,t){return Object.prototype.hasOwnProperty.call(e,t)}t.log=function(){var e,n;console.log("%s - %s",(n=[N((e=new Date).getHours()),N(e.getMinutes()),N(e.getSeconds())].join(":"),[e.getDate(),A[e.getMonth()],n].join(" ")),t.format.apply(t,arguments))},t.inherits=n(5),t._extend=function(e,t){if(!t||!m(t))return e;for(var n=Object.keys(t),r=n.length;r--;)e[n[r]]=t[n[r]];return e}}).call(this,n(1),n(0))},function(e,t,n){"use strict";(function(t){function r(e,t){if(e===t)return 0;for(var n=e.length,r=t.length,i=0,o=Math.min(n,r);i<o;++i)if(e[i]!==t[i]){n=e[i],r=t[i];break}return n<r?-1:r<n?1:0}function i(e){return t.Buffer&&"function"==typeof t.Buffer.isBuffer?t.Buffer.isBuffer(e):!(null==e||!e._isBuffer)}var o=n(7),s=Object.prototype.hasOwnProperty,a=Array.prototype.slice,c="foo"===function(){}.name;function l(e){return Object.prototype.toString.call(e)}function u(e){return!i(e)&&"function"==typeof t.ArrayBuffer&&("function"==typeof ArrayBuffer.isView?ArrayBuffer.isView(e):!!e&&(e instanceof DataView||!!(e.buffer&&e.buffer instanceof ArrayBuffer)))}var f=e.exports=E,p=/\s*function\s+([^\(\s]*)\s*/;function h(e){if(o.isFunction(e)){if(c)return e.name;var t=e.toString().match(p);return t&&t[1]}}function _(e,t){return"string"==typeof e?e.length<t?e:e.slice(0,t):e}function d(e){if(c||!o.isFunction(e))return o.inspect(e);var t=h(e);return"[Function"+(t?": "+t:"")+"]"}function y(e,t,n,r,i){throw new f.AssertionError({message:n,actual:e,expected:t,operator:r,stackStartFunction:i})}function E(e,t){e||y(e,!0,t,"==",f.ok)}function g(e,t,n,s){if(e===t)return!0;if(i(e)&&i(t))return 0===r(e,t);if(o.isDate(e)&&o.isDate(t))return e.getTime()===t.getTime();if(o.isRegExp(e)&&o.isRegExp(t))return e.source===t.source&&e.global===t.global&&e.multiline===t.multiline&&e.lastIndex===t.lastIndex&&e.ignoreCase===t.ignoreCase;if(null!==e&&"object"==typeof e||null!==t&&"object"==typeof t){if(u(e)&&u(t)&&l(e)===l(t)&&!(e instanceof Float32Array||e instanceof Float64Array))return 0===r(new Uint8Array(e.buffer),new Uint8Array(t.buffer));if(i(e)!==i(t))return!1;var c=(s=s||{actual:[],expected:[]}).actual.indexOf(e);return-1!==c&&c===s.expected.indexOf(t)||(s.actual.push(e),s.expected.push(t),function(e,t,n,r){if(null===e||void 0===e||null===t||void 0===t)return!1;if(o.isPrimitive(e)||o.isPrimitive(t))return e===t;if(n&&Object.getPrototypeOf(e)!==Object.getPrototypeOf(t))return!1;var i=v(e),s=v(t);if(i&&!s||!i&&s)return!1;if(i)return g(e=a.call(e),t=a.call(t),n);var c,l,u=b(e),f=b(t);if(u.length!==f.length)return!1;for(u.sort(),f.sort(),l=u.length-1;l>=0;l--)if(u[l]!==f[l])return!1;for(l=u.length-1;l>=0;l--)if(!g(e[c=u[l]],t[c],n,r))return!1;return!0}(e,t,n,s))}return n?e===t:e==t}function v(e){return"[object Arguments]"==Object.prototype.toString.call(e)}function m(e,t){if(!e||!t)return!1;if("[object RegExp]"==Object.prototype.toString.call(t))return t.test(e);try{if(e instanceof t)return!0}catch(e){}return!Error.isPrototypeOf(t)&&!0===t.call({},e)}function O(e,t,n,r){var i;if("function"!=typeof t)throw new TypeError('"block" argument must be a function');"string"==typeof n&&(r=n,n=null),i=function(e){var t;try{e()}catch(e){t=e}return t}(t),r=(n&&n.name?" ("+n.name+").":".")+(r?" "+r:"."),e&&!i&&y(i,n,"Missing expected exception"+r);var s="string"==typeof r,a=!e&&o.isError(i),c=!e&&i&&!n;if((a&&s&&m(i,n)||c)&&y(i,n,"Got unwanted exception"+r),e&&i&&n&&!m(i,n)||!e&&i)throw i}f.AssertionError=function(e){var t;this.name="AssertionError",this.actual=e.actual,this.expected=e.expected,this.operator=e.operator,e.message?(this.message=e.message,this.generatedMessage=!1):(this.message=_(d((t=this).actual),128)+" "+t.operator+" "+_(d(t.expected),128),this.generatedMessage=!0);var n=e.stackStartFunction||y;if(Error.captureStackTrace)Error.captureStackTrace(this,n);else{var r=new Error;if(r.stack){var i=r.stack,o=h(n),s=i.indexOf("\n"+o);if(s>=0){var a=i.indexOf("\n",s+1);i=i.substring(a+1)}this.stack=i}}},o.inherits(f.AssertionError,Error),f.fail=y,f.ok=E,f.equal=function(e,t,n){e!=t&&y(e,t,n,"==",f.equal)},f.notEqual=function(e,t,n){e==t&&y(e,t,n,"!=",f.notEqual)},f.deepEqual=function(e,t,n){g(e,t,!1)||y(e,t,n,"deepEqual",f.deepEqual)},f.deepStrictEqual=function(e,t,n){g(e,t,!0)||y(e,t,n,"deepStrictEqual",f.deepStrictEqual)},f.notDeepEqual=function(e,t,n){g(e,t,!1)&&y(e,t,n,"notDeepEqual",f.notDeepEqual)},f.notDeepStrictEqual=function e(t,n,r){g(t,n,!0)&&y(t,n,r,"notDeepStrictEqual",e)},f.strictEqual=function(e,t,n){e!==t&&y(e,t,n,"===",f.strictEqual)},f.notStrictEqual=function(e,t,n){e===t&&y(e,t,n,"!==",f.notStrictEqual)},f.throws=function(e,t,n){O(!0,e,t,n)},f.doesNotThrow=function(e,t,n){O(!1,e,t,n)},f.ifError=function(e){if(e)throw e};var b=Object.keys||function(e){var t=[];for(var n in e)s.call(e,n)&&t.push(n);return t}}).call(this,n(1))},function(e,t,n){!function(n){"use strict";function r(e,t){t instanceof Object||(t={});var n=/^(data:\w+\/[a-zA-Z\+\-\.]+;base64,)?(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}==|[A-Za-z0-9+\/]{3}=)?$/gi;return!1===t.paddingRequired&&(n=/^(data:\w+\/[a-zA-Z\+\-\.]+;base64,)?(?:[A-Za-z0-9+\/]{4})*(?:[A-Za-z0-9+\/]{2}(==)?|[A-Za-z0-9+\/]{3}=?)?$/gi),n.test(e)}void 0!==e&&e.exports&&(t=e.exports=r),t.isBase64=r}()},function(e,t){e.exports=function(e){return atob(e)}},function(e,t,n){"use strict";var r=n(10),i=n(9),o=n(8);function s(e){for(var t=new Uint8Array(e.length),n=0;n<e.length;n++)t[n]=e.charCodeAt(n);return t.buffer}e.exports=function(e){return o("string"==typeof e,"Argument should be a string"),/^data\:/i.test(e)?function(e){var t=(e=e.replace(/\r?\n/g,"")).indexOf(",");if(-1===t||t<=4)throw new TypeError("malformed data-URI");for(var n=e.substring(5,t).split(";"),i=!1,o="US-ASCII",a=0;a<n.length;a++)"base64"==n[a]?i=!0:0==n[a].indexOf("charset=")&&(o=n[a].substring(8));var c=unescape(e.substring(t+1));i&&(c=r(c));var l=s(c);return l.type=n[0]||"text/plain",l.charset=o,l}(e):(i(e)&&(e=r(e)),s(e))}},function(e,t,n){"use strict";e.exports={libraryName:"ZCC"}},function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),i=n(12),o=n(11),s=function(){function e(){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e)}return r(e,null,[{key:"getLoadedLibrary",value:function(){return!!window&&window[i.libraryName]}},{key:"strToCamelCase",value:function(e){return e.split(/[-_]/).map(function(e,t){return 0===t?e.toLowerCase():e.charAt(0).toUpperCase()+e.slice(1).toLowerCase()}).join("")}},{key:"getDurationDisplay",value:function(e){var t=Math.floor(e/36e5),n=Math.floor(e/6e4%60),r=Math.floor(e/1e3%60),i=Math.round(e%1e3/100);return i>=10&&(i=9),t>0&&t<10&&(t="0"+t),n>0&&n<10&&(n="0"+n),r>0&&r<10&&(r="0"+r),t?t+":"+n+":"+r+"."+i:n?n+":"+r+"."+i:r?"00:"+r+"."+i:"00:00."+i}},{key:"buildBinaryPacket",value:function(t,n,r,i){var o=new ArrayBuffer(9),s=new DataView(o);return s.setInt8(0,t),s.setInt32(1,n,!1),s.setInt32(5,r,!1),new Uint8Array(e.arrayBufferConcat(o,i))}},{key:"buildCodecHeader",value:function(e,t,n){var r=new ArrayBuffer(4),i=new DataView(r);return i.setUint16(0,e,!0),i.setUint8(2,t),i.setUint8(3,n),btoa(String.fromCharCode.apply(null,new Uint8Array(r)))}},{key:"arrayBufferConcat",value:function(){var e=0,t=null;for(var n in arguments)e+=(t=arguments[n]).byteLength;var r=new Uint8Array(e),i=0;for(var o in arguments)t=arguments[o],r.set(new Uint8Array(t),i),i+=t.byteLength;return r.buffer}},{key:"parseCodedHeader",value:function(e){var t=new DataView(o("data:text/plain;base64,"+e));return{rate:t.getUint16(0,!0),framesPerPacket:t.getUint8(2),frameSize:t.getUint8(3)}}},{key:"isFunction",value:function(t){return e.instanceOf(t,Function)}},{key:"isArray",value:function(t){return e.instanceOf(t,Array)}},{key:"instanceOf",value:function(e,t){return e instanceof t}},{key:"parseIncomingBinaryMessage",value:function(e){var t=new DataView(e.slice(0,9));return{messageType:t.getUint8(0),messageData:new Uint8Array(e.slice(9)),messageId:t.getUint32(1,!1),packetId:t.getUint32(5,!1)}}}]),e}();e.exports=s},,,,,,,function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),i=n(4),o=n(2),s=n(13),a=function(e){function t(e,n){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t);var r=function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}(this,(t.__proto__||Object.getPrototypeOf(t)).call(this));r.codecDetails=s.parseCodedHeader(e.codec_header),r.messageDidStart=!1;var i=s.getLoadedLibrary();return r.options=Object.assign({encoding:"32bitFloat",channels:1,sampleRate:t.detectSampleRate(r.codecDetails.rate),flushingTime:300},n.options,{messageData:e}),r.options.decoder&&!s.isFunction(r.options.decoder)&&(r.options.decoder=i.Decoder),r.options.player&&!s.isFunction(r.options.player)&&(r.options.player=i.Player),r.initPlayer(r.options.sampleRate),r.initDecoder(),r.initSessionHandlers(),r.session=n,r.instanceId=e.stream_id.toString(),r.session.on([o.EVENT_INCOMING_VOICE_DATA,r.instanceId],r.incomingVoiceHandler),r.session.on([o.EVENT_INCOMING_VOICE_DID_STOP,r.instanceId],r.incomingVoiceDidStopHandler),r.on([o.EVENT_INCOMING_VOICE_DATA_DECODED,r.instanceId],r.decodedAudioHandler),r}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(t,i),r(t,null,[{key:"PersistentPlayer",get:function(){return t.persistentPlayer},set:function(e){t.persistentPlayer=e}}]),r(t,[{key:"initSessionHandlers",value:function(){var e=this;this.decodedAudioHandler=function(t){e.player&&s.isFunction(e.player.feed)&&e.player.feed(t)},this.incomingVoiceDidStopHandler=function(){e.emit(o.EVENT_INCOMING_VOICE_DID_STOP,e),e.player&&s.isFunction(e.player.destroy)&&!t.PersistentPlayer&&e.player.destroy(),e.decoder&&s.isFunction(e.decoder.destroy)&&e.decoder.destroy(),e.session.off([o.EVENT_INCOMING_VOICE_DATA,e.instanceId],e.incomingVoiceHandler),e.session.off([o.EVENT_INCOMING_VOICE_DID_STOP,e.instanceId],e.incomingVoiceDidStopHandler)},this.incomingVoiceHandler=function(t){e.messageDidStart||(e.messageDidStart=!0,e.emit(o.EVENT_INCOMING_VOICE_DID_START,e),e.session.onIncomingVoiceDidStart(e)),e.emit(o.EVENT_INCOMING_VOICE_DATA,t),e.decoder&&e.decode(t)}}},{key:"decode",value:function(e){this.decoder.decode(e.messageData)}},{key:"initDecoder",value:function(){var e=this;this.options.decoder&&(this.options.decoder.prototype.ondata=function(t){e.emit(o.EVENT_INCOMING_VOICE_DATA_DECODED,t),e.session.onIncomingVoiceDecoded(t,e)},this.decoder=new this.options.decoder(this.options))}},{key:"initPlayer",value:function(e){if(t.PersistentPlayer)return this.player=t.PersistentPlayer,void this.player.setSampleRate(e);this.options.player&&(this.player=new this.options.player(this.options),t.PersistentPlayer=this.player)}}],[{key:"detectSampleRate",value:function(e){return e<=24e3?24e3:48e3}}]),t}();e.exports=a}])});