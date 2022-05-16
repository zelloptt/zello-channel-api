!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.OutgoingMessage=t():(e.ZCC=e.ZCC||{},e.ZCC.OutgoingMessage=t())}(window,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var i=t[r]={i:r,l:!1,exports:{}};return e[r].call(i.exports,i,i.exports,n),i.l=!0,i.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{enumerable:!0,get:r})},n.r=function(e){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(e,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(e,"__esModule",{value:!0})},n.t=function(e,t){if(1&t&&(e=n(e)),8&t)return e;if(4&t&&"object"==typeof e&&e&&e.__esModule)return e;var r=Object.create(null);if(n.r(r),Object.defineProperty(r,"default",{enumerable:!0,value:e}),2&t&&"string"!=typeof e)for(var i in e)n.d(r,i,function(t){return e[t]}.bind(null,i));return r},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=40)}({0:function(e,t){var n,r,i=e.exports={};function o(){throw new Error("setTimeout has not been defined")}function s(){throw new Error("clearTimeout has not been defined")}function a(e){if(n===setTimeout)return setTimeout(e,0);if((n===o||!n)&&setTimeout)return n=setTimeout,setTimeout(e,0);try{return n(e,0)}catch(t){try{return n.call(null,e,0)}catch(t){return n.call(this,e,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:o}catch(e){n=o}try{r="function"==typeof clearTimeout?clearTimeout:s}catch(e){r=s}}();var c,l=[],u=!1,f=-1;function h(){u&&c&&(u=!1,c.length?l=c.concat(l):f=-1,l.length&&_())}function _(){if(!u){var e=a(h);u=!0;for(var t=l.length;t;){for(c=l,l=[];++f<t;)c&&c[f].run();f=-1,t=l.length}c=null,u=!1,function(e){if(r===clearTimeout)return clearTimeout(e);if((r===s||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(e);try{r(e)}catch(t){try{return r.call(null,e)}catch(t){return r.call(this,e)}}}(e)}}function p(e,t){this.fun=e,this.array=t}function d(){}i.nextTick=function(e){var t=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)t[n-1]=arguments[n];l.push(new p(e,t)),1!==l.length||u||a(_)},p.prototype.run=function(){this.fun.apply(null,this.array)},i.title="browser",i.browser=!0,i.env={},i.argv=[],i.version="",i.versions={},i.on=d,i.addListener=d,i.once=d,i.off=d,i.removeListener=d,i.removeAllListeners=d,i.emit=d,i.prependListener=d,i.prependOnceListener=d,i.listeners=function(e){return[]},i.binding=function(e){throw new Error("process.binding is not supported")},i.cwd=function(){return"/"},i.chdir=function(e){throw new Error("process.chdir is not supported")},i.umask=function(){return 0}},1:function(e,t,n){"use strict";e.exports={ERROR_NOT_ENOUGH_PARAMS:"Not enough parameters",ERROR_INVALID_SERVER_PROTOCOL:"Invalid server protocol, use ws:// or wss://",ERROR_UNSUPPORTED:"Your browser does not support all required APIs.\nRead more here https://github.com/zelloptt/zello-channel-api",ERROR_RECORDING_NO_HTTPS:"Recording will work over https:// loaded pages only",ERROR_WIDGET_ELEMENT_NOT_FOUND:"DOM element for widget is not found",ERROR_INVALID_DECODER:"Invalid incoming message decoder. Should implement ZCC.Decoder interface",ERROR_INVALID_PLAYER:"Invalid incoming message player. Should implement ZCC.Player interface",ERROR_INVALID_RECORDER:"Invalid outgoing message recorder. Should implement ZCC.Recorder interface",ERROR_INVALID_ENCODER:"Invalid outgoing message encoder. Should implement ZCC.Encoder interface",ERROR_SESSION_FAIL_CONNECT:"Failed to connect",ERROR_INVALID_IMAGE_WIDTH_OR_HEIGHT:"Invalid image width or height",ERROR_FAILED_TO_SEND_IMAGE:"Failed to send image",ERROR_IMAGE_NOT_READY_TO_BE_SENT:"Image is not ready to be sent",ERROR_NO_CAMERA_AVAILABLE:"No camera available",ERROR_TYPE_UNKNOWN_SERVER_ERROR:"Unknown server error",ERROR_TYPE_CONFIGURATION:"configuration",EVENT_ERROR:"error",EVENT_CONNECT:"connect",EVENT_CLOSE:"close",EVENT_LOGON:"logon",EVENT_STATUS:"status",EVENT_START_STREAM:"start_stream",EVENT_STOP_STREAM:"stop_stream",EVENT_SESSION_START_CONNECT:"session_start_connect",EVENT_SESSION_CONNECT:"session_connect",EVENT_SESSION_FAIL_CONNECT:"session_fail_connect",EVENT_SESSION_CONNECTION_LOST:"session_connection_lost",EVENT_SESSION_DISCONNECT:"session_disconnect",EVENT_INCOMING_VOICE_WILL_START:"incoming_voice_will_start",EVENT_INCOMING_VOICE_DID_START:"incoming_voice_did_start",EVENT_INCOMING_VOICE_DID_STOP:"incoming_voice_did_stop",EVENT_INCOMING_VOICE_DATA:"incoming_voice_data",EVENT_INCOMING_VOICE_DATA_DECODED:"incoming_voice_data_decoded",EVENT_INCOMING_IMAGE_DATA:"incoming_image_data",EVENT_DATA:"data",EVENT_DATA_ENCODED:"data_encoded",EVENT_ENCODER_DONE:"encoder_done",EVENT_RECORDER_READY:"recorder_ready",EVENT_WIDGET_OPEN_BUTTON_CLICK:"widget_open_button_click",EVENT_WIDGET_MUTE:"widget_mute",EVENT_WIDGET_UNMUTE:"widget_unmute",EVENT_WIDGET_SPEAKING_USERNAME_CLICK:"speaking_username_click",EVENT_INCOMING_TEXT_MESSAGE:"incoming_text_message",EVENT_INCOMING_LOCATION:"incoming_location",EVENT_INCOMING_IMAGE:"incoming_image",EVENT_IMAGE_DATA:"image_data",EVENT_THUMBNAIL_DATA:"thumbnail_data",EVENT_IMAGE_PREVIEW_DATA:"image_preview_data",EVENT_THUMBNAIL_PREVIEW_DATA:"thumbnail_preview_data",EVENT_DISPATCH_CALL_STATUS:"dispatch_call_status",MAX_OUTGOING_IMAGE_SCALE_PX:1280,OUTGOING_IMAGE_THUMBNAIL_SCALE_PX:90,SN_STATUS_SUCCESS:"success",SN_STATUS_ONLINE:"online",SN_STATUS_OFFLINE:"offline",MESSAGE_TYPE_AUDIO:1,MESSAGE_TYPE_IMAGE:2,MESSAGE_TYPE_JSON:123,IMAGE_TYPE_FULL:1,IMAGE_TYPE_THUMBNAIL:2,TALK_PRIORITY_VALUE_NORMAL:100,TALK_PRIORITY_VALUE_LOW:10}},2:function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),i=function e(t,n,r){null===t&&(t=Function.prototype);var i=Object.getOwnPropertyDescriptor(t,n);if(void 0===i){var o=Object.getPrototypeOf(t);return null===o?void 0:e(o,n,r)}if("value"in i)return i.value;var s=i.get;return void 0!==s?s.call(r):void 0},o=n(3).EventEmitter2,s=function(e){function t(){return function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t),function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}(this,(t.__proto__||Object.getPrototypeOf(t)).call(this,{wildcard:!0}))}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(t,o),r(t,[{key:"emit",value:function(){i(t.prototype.__proto__||Object.getPrototypeOf(t.prototype),"emit",this).apply(this,arguments);var e=arguments[0];e instanceof Array&&e.length>1||"string"==typeof e&&-1!==e.indexOf(".")||(arguments[0]=(arguments[0]instanceof Array?arguments[0][0]:arguments[0])+".*",i(t.prototype.__proto__||Object.getPrototypeOf(t.prototype),"emit",this).apply(this,arguments))}}]),t}();e.exports=s},3:function(e,t,n){(function(r){var i;!function(o){var s=Array.isArray?Array.isArray:function(e){return"[object Array]"===Object.prototype.toString.call(e)},a=10;function c(){this._events={},this._conf&&l.call(this,this._conf)}function l(e){e?(this._conf=e,e.delimiter&&(this.delimiter=e.delimiter),this._maxListeners=e.maxListeners!==o?e.maxListeners:a,e.wildcard&&(this.wildcard=e.wildcard),e.newListener&&(this._newListener=e.newListener),e.removeListener&&(this._removeListener=e.removeListener),e.verboseMemoryLeak&&(this.verboseMemoryLeak=e.verboseMemoryLeak),this.wildcard&&(this.listenerTree={})):this._maxListeners=a}function u(e,t){var n="(node) warning: possible EventEmitter memory leak detected. "+e+" listeners added. Use emitter.setMaxListeners() to increase limit.";if(this.verboseMemoryLeak&&(n+=" Event name: "+t+"."),void 0!==r&&r.emitWarning){var i=new Error(n);i.name="MaxListenersExceededWarning",i.emitter=this,i.count=e,r.emitWarning(i)}else console.error(n),console.trace&&console.trace()}function f(e){this._events={},this._newListener=!1,this._removeListener=!1,this.verboseMemoryLeak=!1,l.call(this,e)}function h(e,t,n,r){if(!n)return[];var i,o,s,a,c,l,u,f=[],_=t.length,p=t[r],d=t[r+1];if(r===_&&n._listeners){if("function"==typeof n._listeners)return e&&e.push(n._listeners),[n];for(i=0,o=n._listeners.length;i<o;i++)e&&e.push(n._listeners[i]);return[n]}if("*"===p||"**"===p||n[p]){if("*"===p){for(s in n)"_listeners"!==s&&n.hasOwnProperty(s)&&(f=f.concat(h(e,t,n[s],r+1)));return f}if("**"===p){for(s in(u=r+1===_||r+2===_&&"*"===d)&&n._listeners&&(f=f.concat(h(e,t,n,_))),n)"_listeners"!==s&&n.hasOwnProperty(s)&&("*"===s||"**"===s?(n[s]._listeners&&!u&&(f=f.concat(h(e,t,n[s],_))),f=f.concat(h(e,t,n[s],r))):f=s===d?f.concat(h(e,t,n[s],r+2)):f.concat(h(e,t,n[s],r)));return f}f=f.concat(h(e,t,n[p],r+1))}if((a=n["*"])&&h(e,t,a,r+1),c=n["**"])if(r<_)for(s in c._listeners&&h(e,t,c,_),c)"_listeners"!==s&&c.hasOwnProperty(s)&&(s===d?h(e,t,c[s],r+2):s===p?h(e,t,c[s],r+1):((l={})[s]=c[s],h(e,t,{"**":l},r+1)));else c._listeners?h(e,t,c,_):c["*"]&&c["*"]._listeners&&h(e,t,c["*"],_);return f}f.EventEmitter2=f,f.prototype.delimiter=".",f.prototype.setMaxListeners=function(e){e!==o&&(this._maxListeners=e,this._conf||(this._conf={}),this._conf.maxListeners=e)},f.prototype.event="",f.prototype.once=function(e,t){return this._once(e,t,!1)},f.prototype.prependOnceListener=function(e,t){return this._once(e,t,!0)},f.prototype._once=function(e,t,n){return this._many(e,1,t,n),this},f.prototype.many=function(e,t,n){return this._many(e,t,n,!1)},f.prototype.prependMany=function(e,t,n){return this._many(e,t,n,!0)},f.prototype._many=function(e,t,n,r){var i=this;if("function"!=typeof n)throw new Error("many only accepts instances of Function");function o(){return 0==--t&&i.off(e,o),n.apply(this,arguments)}return o._origin=n,this._on(e,o,r),i},f.prototype.emit=function(){this._events||c.call(this);var e=arguments[0];if("newListener"===e&&!this._newListener&&!this._events.newListener)return!1;var t,n,r,i,o,s=arguments.length;if(this._all&&this._all.length){if(o=this._all.slice(),s>3)for(t=new Array(s),i=0;i<s;i++)t[i]=arguments[i];for(r=0,n=o.length;r<n;r++)switch(this.event=e,s){case 1:o[r].call(this,e);break;case 2:o[r].call(this,e,arguments[1]);break;case 3:o[r].call(this,e,arguments[1],arguments[2]);break;default:o[r].apply(this,t)}}if(this.wildcard){o=[];var a="string"==typeof e?e.split(this.delimiter):e.slice();h.call(this,o,a,this.listenerTree,0)}else{if("function"==typeof(o=this._events[e])){switch(this.event=e,s){case 1:o.call(this);break;case 2:o.call(this,arguments[1]);break;case 3:o.call(this,arguments[1],arguments[2]);break;default:for(t=new Array(s-1),i=1;i<s;i++)t[i-1]=arguments[i];o.apply(this,t)}return!0}o&&(o=o.slice())}if(o&&o.length){if(s>3)for(t=new Array(s-1),i=1;i<s;i++)t[i-1]=arguments[i];for(r=0,n=o.length;r<n;r++)switch(this.event=e,s){case 1:o[r].call(this);break;case 2:o[r].call(this,arguments[1]);break;case 3:o[r].call(this,arguments[1],arguments[2]);break;default:o[r].apply(this,t)}return!0}if(!this._all&&"error"===e)throw arguments[1]instanceof Error?arguments[1]:new Error("Uncaught, unspecified 'error' event.");return!!this._all},f.prototype.emitAsync=function(){this._events||c.call(this);var e=arguments[0];if("newListener"===e&&!this._newListener&&!this._events.newListener)return Promise.resolve([!1]);var t,n,r,i,o,s=[],a=arguments.length;if(this._all){if(a>3)for(t=new Array(a),i=1;i<a;i++)t[i]=arguments[i];for(r=0,n=this._all.length;r<n;r++)switch(this.event=e,a){case 1:s.push(this._all[r].call(this,e));break;case 2:s.push(this._all[r].call(this,e,arguments[1]));break;case 3:s.push(this._all[r].call(this,e,arguments[1],arguments[2]));break;default:s.push(this._all[r].apply(this,t))}}if(this.wildcard){o=[];var l="string"==typeof e?e.split(this.delimiter):e.slice();h.call(this,o,l,this.listenerTree,0)}else o=this._events[e];if("function"==typeof o)switch(this.event=e,a){case 1:s.push(o.call(this));break;case 2:s.push(o.call(this,arguments[1]));break;case 3:s.push(o.call(this,arguments[1],arguments[2]));break;default:for(t=new Array(a-1),i=1;i<a;i++)t[i-1]=arguments[i];s.push(o.apply(this,t))}else if(o&&o.length){if(o=o.slice(),a>3)for(t=new Array(a-1),i=1;i<a;i++)t[i-1]=arguments[i];for(r=0,n=o.length;r<n;r++)switch(this.event=e,a){case 1:s.push(o[r].call(this));break;case 2:s.push(o[r].call(this,arguments[1]));break;case 3:s.push(o[r].call(this,arguments[1],arguments[2]));break;default:s.push(o[r].apply(this,t))}}else if(!this._all&&"error"===e)return arguments[1]instanceof Error?Promise.reject(arguments[1]):Promise.reject("Uncaught, unspecified 'error' event.");return Promise.all(s)},f.prototype.on=function(e,t){return this._on(e,t,!1)},f.prototype.prependListener=function(e,t){return this._on(e,t,!0)},f.prototype.onAny=function(e){return this._onAny(e,!1)},f.prototype.prependAny=function(e){return this._onAny(e,!0)},f.prototype.addListener=f.prototype.on,f.prototype._onAny=function(e,t){if("function"!=typeof e)throw new Error("onAny only accepts instances of Function");return this._all||(this._all=[]),t?this._all.unshift(e):this._all.push(e),this},f.prototype._on=function(e,t,n){if("function"==typeof e)return this._onAny(e,t),this;if("function"!=typeof t)throw new Error("on only accepts instances of Function");return this._events||c.call(this),this._newListener&&this.emit("newListener",e,t),this.wildcard?(function(e,t){for(var n=0,r=(e="string"==typeof e?e.split(this.delimiter):e.slice()).length;n+1<r;n++)if("**"===e[n]&&"**"===e[n+1])return;for(var i=this.listenerTree,s=e.shift();s!==o;){if(i[s]||(i[s]={}),i=i[s],0===e.length)return i._listeners?("function"==typeof i._listeners&&(i._listeners=[i._listeners]),i._listeners.push(t),!i._listeners.warned&&this._maxListeners>0&&i._listeners.length>this._maxListeners&&(i._listeners.warned=!0,u.call(this,i._listeners.length,s))):i._listeners=t,!0;s=e.shift()}return!0}.call(this,e,t),this):(this._events[e]?("function"==typeof this._events[e]&&(this._events[e]=[this._events[e]]),n?this._events[e].unshift(t):this._events[e].push(t),!this._events[e].warned&&this._maxListeners>0&&this._events[e].length>this._maxListeners&&(this._events[e].warned=!0,u.call(this,this._events[e].length,e))):this._events[e]=t,this)},f.prototype.off=function(e,t){if("function"!=typeof t)throw new Error("removeListener only takes instances of Function");var n,r=[];if(this.wildcard){var i="string"==typeof e?e.split(this.delimiter):e.slice();r=h.call(this,null,i,this.listenerTree,0)}else{if(!this._events[e])return this;n=this._events[e],r.push({_listeners:n})}for(var a=0;a<r.length;a++){var c=r[a];if(n=c._listeners,s(n)){for(var l=-1,u=0,f=n.length;u<f;u++)if(n[u]===t||n[u].listener&&n[u].listener===t||n[u]._origin&&n[u]._origin===t){l=u;break}if(l<0)continue;return this.wildcard?c._listeners.splice(l,1):this._events[e].splice(l,1),0===n.length&&(this.wildcard?delete c._listeners:delete this._events[e]),this._removeListener&&this.emit("removeListener",e,t),this}(n===t||n.listener&&n.listener===t||n._origin&&n._origin===t)&&(this.wildcard?delete c._listeners:delete this._events[e],this._removeListener&&this.emit("removeListener",e,t))}return function e(t){if(t!==o){var n=Object.keys(t);for(var r in n){var i=n[r],s=t[i];s instanceof Function||"object"!=typeof s||null===s||(Object.keys(s).length>0&&e(t[i]),0===Object.keys(s).length&&delete t[i])}}}(this.listenerTree),this},f.prototype.offAny=function(e){var t,n=0,r=0;if(e&&this._all&&this._all.length>0){for(n=0,r=(t=this._all).length;n<r;n++)if(e===t[n])return t.splice(n,1),this._removeListener&&this.emit("removeListenerAny",e),this}else{if(t=this._all,this._removeListener)for(n=0,r=t.length;n<r;n++)this.emit("removeListenerAny",t[n]);this._all=[]}return this},f.prototype.removeListener=f.prototype.off,f.prototype.removeAllListeners=function(e){if(e===o)return!this._events||c.call(this),this;if(this.wildcard)for(var t="string"==typeof e?e.split(this.delimiter):e.slice(),n=h.call(this,null,t,this.listenerTree,0),r=0;r<n.length;r++)n[r]._listeners=null;else this._events&&(this._events[e]=null);return this},f.prototype.listeners=function(e){if(this.wildcard){var t=[],n="string"==typeof e?e.split(this.delimiter):e.slice();return h.call(this,t,n,this.listenerTree,0),t}return this._events||c.call(this),this._events[e]||(this._events[e]=[]),s(this._events[e])||(this._events[e]=[this._events[e]]),this._events[e]},f.prototype.eventNames=function(){return Object.keys(this._events)},f.prototype.listenerCount=function(e){return this.listeners(e).length},f.prototype.listenersAny=function(){return this._all?this._all:[]},(i=function(){return f}.call(t,n,t,e))===o||(e.exports=i)}()}).call(this,n(0))},4:function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),i=n(5),o=n(6),s=function(){function e(){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e)}return r(e,null,[{key:"getLoadedLibrary",value:function(){return!!window&&window[i.libraryName]}},{key:"strToCamelCase",value:function(e){return e.split(/[-_]/).map(function(e,t){return 0===t?e.toLowerCase():e.charAt(0).toUpperCase()+e.slice(1).toLowerCase()}).join("")}},{key:"getDurationDisplay",value:function(e){var t=Math.floor(e/36e5),n=Math.floor(e/6e4%60),r=Math.floor(e/1e3%60),i=Math.round(e%1e3/100);return i>=10&&(i=9),t>0&&t<10&&(t="0"+t),n>0&&n<10&&(n="0"+n),r>0&&r<10&&(r="0"+r),t?t+":"+n+":"+r+"."+i:n?n+":"+r+"."+i:r?"00:"+r+"."+i:"00:00."+i}},{key:"buildBinaryPacket",value:function(t,n,r,i){var o=new ArrayBuffer(9),s=new DataView(o);return s.setInt8(0,t),s.setInt32(1,n,!1),s.setInt32(5,r,!1),new Uint8Array(e.arrayBufferConcat(o,i))}},{key:"buildCodecHeader",value:function(e,t,n){var r=new ArrayBuffer(4),i=new DataView(r);return i.setUint16(0,e,!0),i.setUint8(2,t),i.setUint8(3,n),btoa(String.fromCharCode.apply(null,new Uint8Array(r)))}},{key:"arrayBufferConcat",value:function(){var e=0,t=null;for(var n in arguments)e+=(t=arguments[n]).byteLength;var r=new Uint8Array(e),i=0;for(var o in arguments)t=arguments[o],r.set(new Uint8Array(t),i),i+=t.byteLength;return r.buffer}},{key:"parseCodedHeader",value:function(e){var t=new DataView(o("data:text/plain;base64,"+e));return{rate:t.getUint16(0,!0),framesPerPacket:t.getUint8(2),frameSize:t.getUint8(3)}}},{key:"isFunction",value:function(t){return e.instanceOf(t,Function)}},{key:"isArray",value:function(t){return e.instanceOf(t,Array)}},{key:"instanceOf",value:function(e,t){return e instanceof t}},{key:"parseIncomingBinaryMessage",value:function(e){var t=new DataView(e.slice(0,9));return{messageType:t.getUint8(0),messageData:new Uint8Array(e.slice(9)),messageId:t.getUint32(1,!1),packetId:t.getUint32(5,!1)}}}]),e}();e.exports=s},40:function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),i=n(2),o=n(1),s=n(4),a=function(e){function t(e){var n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:{},r=arguments[2];!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t);var i=function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}(this,(t.__proto__||Object.getPrototypeOf(t)).call(this)),o=s.getLoadedLibrary();return i.options=Object.assign({autoStart:!0,recorderSampleRate:44100,encoderFrameSize:20,encoderSampleRate:16e3,encoderApplication:2048},e.options,n),i.options.recorder&&!s.isFunction(i.options.recorder)&&(i.options.recorder=o.Recorder),i.options.encoder&&!s.isFunction(i.options.encoder)&&(i.options.encoder=o.Encoder),i.session=e,i.currentMessageId=null,i.currentPacketId=0,i.initEncoder(),i.initRecorder(r),!i.recorder&&i.options.autoStart&&i.start(r),i}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(t,i),r(t,[{key:"initEncoder",value:function(){var e=this;this.options.encoder&&(this.options.encoder.prototype.ondata=function(t){Array.isArray(t)?t.forEach(function(t){return e.processEncodedData(t)}):e.processEncodedData(t)},this.encoder=new this.options.encoder)}},{key:"processEncodedData",value:function(e){var t=s.buildBinaryPacket(1,this.currentMessageId,++this.currentPacketId,e);this.emit(o.EVENT_DATA_ENCODED,t)}},{key:"initRecorder",value:function(e){var t=this;this.options.recorder&&(this.options.recorder.prototype.ondata=function(e){t.emit(o.EVENT_DATA,e),t.encoder.encode(e)},this.options.recorder.prototype.onready=function(){t.sendEncoderInitMessage(),t.options.autoStart&&t.start(e)},this.recorder=new this.options.recorder(this.options,this.encoder),s.isFunction(this.recorder.init)&&this.recorder.init())}},{key:"sendEncoderInitMessage",value:function(){if(this.encoder&&s.isFunction(this.encoder.postMessage)){var e=this.options.recorderSampleRate;s.isFunction(this.recorder.getSampleRate)&&(e=this.recorder.getSampleRate()),this.encoder.postMessage(Object.assign({command:"init",originalSampleRate:e},this.options))}}},{key:"stopRecording",value:function(){this.recorder&&this.recorder.stop&&this.recorder.stop()}},{key:"startRecording",value:function(){this.recorder&&this.recorder.start&&this.recorder.start()}},{key:"stop",value:function(e){return this.stopRecording(),this.session.stopStream({stream_id:this.currentMessageId},e)}},{key:"start",value:function(e){var t=this,n={type:"audio",codec:"opus",codec_header:s.buildCodecHeader(this.options.encoderSampleRate,1,this.options.encoderFrameSize),packet_duration:this.options.encoderFrameSize};this.options.for&&(n.for=this.options.for),void 0!==this.options.talkPriority&&(n.talk_priority=this.options.talkPriority),this.session.startStream(n,e).then(function(e){t.currentMessageId=e.stream_id,t.startRecording()}).catch(function(){t.stopRecording()})}}],[{key:"talkPriorityLow",get:function(){return o.TALK_PRIORITY_VALUE_LOW}},{key:"talkPriorityNormal",get:function(){return o.TALK_PRIORITY_VALUE_NORMAL}}]),t}();e.exports=a},5:function(e,t,n){"use strict";e.exports={libraryName:"ZCC"}},6:function(e,t,n){"use strict";var r=n(7),i=n(8);function o(e){for(var t=new Uint8Array(e.length),n=0;n<e.length;n++)t[n]=e.charCodeAt(n);return t.buffer}e.exports=function(e){if("string"!=typeof e)throw Error("Argument should be a string");return/^data\:/i.test(e)?function(e){var t=(e=e.replace(/\r?\n/g,"")).indexOf(",");if(-1===t||t<=4)throw new TypeError("malformed data-URI");for(var n=e.substring(5,t).split(";"),i=!1,s="US-ASCII",a=0;a<n.length;a++)"base64"==n[a]?i=!0:0==n[a].indexOf("charset=")&&(s=n[a].substring(8));var c=unescape(e.substring(t+1));i&&(c=r(c));var l=o(c);return l.type=n[0]||"text/plain",l.charset=s,l}(e):(i(e)&&(e=r(e)),o(e))}},7:function(e,t){e.exports=function(e){return atob(e)}},8:function(e,t,n){!function(n){"use strict";function r(e,t){if(e instanceof Boolean||"boolean"==typeof e)return!1;if(t instanceof Object||(t={}),t.hasOwnProperty("allowBlank")&&!t.allowBlank&&""===e)return!1;var n="(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}==|[A-Za-z0-9+/]{3}=)?";return t.mime&&(n="(data:\\w+\\/[a-zA-Z\\+\\-\\.]+;base64,)?"+n),!1===t.paddingRequired&&(n="(?:[A-Za-z0-9+\\/]{4})*(?:[A-Za-z0-9+\\/]{2}(==)?|[A-Za-z0-9+\\/]{3}=?)?"),new RegExp("^"+n+"$","gi").test(e)}void 0!==e&&e.exports&&(t=e.exports=r),t.isBase64=r}()}})});