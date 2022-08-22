!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.Player=e():(t.ZCC=t.ZCC||{},t.ZCC.Player=e())}(window,function(){return function(t){var e={};function i(n){if(e[n])return e[n].exports;var o=e[n]={i:n,l:!1,exports:{}};return t[n].call(o.exports,o,o.exports,i),o.l=!0,o.exports}return i.m=t,i.c=e,i.d=function(t,e,n){i.o(t,e)||Object.defineProperty(t,e,{enumerable:!0,get:n})},i.r=function(t){"undefined"!=typeof Symbol&&Symbol.toStringTag&&Object.defineProperty(t,Symbol.toStringTag,{value:"Module"}),Object.defineProperty(t,"__esModule",{value:!0})},i.t=function(t,e){if(1&e&&(t=i(t)),8&e)return t;if(4&e&&"object"==typeof t&&t&&t.__esModule)return t;var n=Object.create(null);if(i.r(n),Object.defineProperty(n,"default",{enumerable:!0,value:t}),2&e&&"string"!=typeof t)for(var o in t)i.d(n,o,function(e){return t[e]}.bind(null,o));return n},i.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return i.d(e,"a",e),e},i.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},i.p="",i(i.s=17)}({17:function(t,e,i){"use strict";var n=i(18);t.exports=n},18:function(t,e,i){"use strict";function n(t,e){this.init(t,e)}n.prototype.init=function(t,e){this.options=Object.assign({},{encoding:"16bitInt",channels:1,sampleRate:8e3,flushingTime:1e3,gain:1},t),void 0===this.options.gain||this.isValidGain(this.options.gain)||(this.options.gain=1),this.samples=new Float32Array([]),this.flush=this.flush.bind(this),this.startTimestampMs=Date.now(),this.flushTimeSyncMs=this.options.flushingTime,this.flushTimer=setTimeout(this.flush,this.flushTimeSyncMs),this.maxValue=this.getMaxValue(),this.typedArray=this.getTypedArray(),this.onendedCallback=e,this.feedCounter=0,this.createContext()},n.prototype.webAudioTouchUnlock=function(t){return new Promise(function(e,i){if("suspended"===t.state&&"ontouchstart"in window){var n=function n(){t.resume().then(function(){document.body.removeEventListener("touchstart",n),document.body.removeEventListener("touchend",n),e(!0)},function(t){i(t)})};document.body.addEventListener("touchstart",n,!1),document.body.addEventListener("touchend",n,!1)}else e(!1)})},n.prototype.isValidGain=function(t){return isFinite(t)&&t<=2&&t>=0},n.prototype.getMaxValue=function(){var t={"8bitInt":128,"16bitInt":32768,"32bitInt":2147483648,"32bitFloat":1};return t[this.options.encoding]?t[this.options.encoding]:t["16bitInt"]},n.prototype.getTypedArray=function(){var t={"8bitInt":Int8Array,"16bitInt":Int16Array,"32bitInt":Int32Array,"32bitFloat":Float32Array};return t[this.options.encoding]?t[this.options.encoding]:t["16bitInt"]},n.prototype.createContext=function(){this.audioCtx=new(window.AudioContext||window.webkitAudioContext),this.webAudioTouchUnlock(this.audioCtx).then(function(){this.audioCtx&&(this.gainNode=this.audioCtx.createGain(),this.gainNode.gain.value=this.options.gain,this.options.useAudioElement?this.createAudioElement():this.gainNode.connect(this.audioCtx.destination),this.startTime=this.audioCtx.currentTime)}.bind(this),function(t){console.error(t)})},n.prototype.createAudioElement=function(){var t=this.audioCtx.createMediaStreamDestination();this.gainNode.connect(t),this.audioEl=new Audio,this.audioEl.srcObject=t.stream,this.startTime=this.audioCtx.currentTime,this.options.outputDeviceId&&this.audioEl.setSinkId(this.options.outputDeviceId),this.audioEl.play()},n.prototype.isTypedArray=function(t){return t.byteLength&&t.buffer&&t.buffer.constructor===ArrayBuffer},n.prototype.feed=function(t){if(!this.muted&&this.isTypedArray(t)){t=this.getFormattedValue(t);var e=new Float32Array(this.samples.length+t.length);e.set(this.samples,0),e.set(t,this.samples.length),this.samples=e,this.feedCounter++}},n.prototype.getFormattedValue=function(t){for(var e=new this.typedArray(t.buffer),i=new Float32Array(e.length),n=0;n<e.length;n++)i[n]=e[n]/this.maxValue;return i},n.prototype.setGain=function(t){if(!this.isValidGain(t))return!1;this.options.gain=t,this.gainNode.gain.value=t},n.prototype.setSinkId=function(t){this.audioEl&&this.audioEl.setSinkId(t)},n.prototype.destroy=function(){this.flushTimer&&(clearTimeout(this.flushTimer),this.flushTimer=null),this.flushTimeSyncMs=0,this.startTimestampMs=0,this.samples=new Float32Array([]),this.feedCounter=0,this.audioCtx.close(),this.audioCtx=null},n.prototype.flush=function(){this.flushTimeSyncMs+=this.options.flushingTime;var t=Date.now()-this.startTimestampMs,e=this.flushTimeSyncMs-t;if((e<0||e>2*this.options.flushingTime)&&(e=this.options.flushingTime),this.flushTimer=setTimeout(this.flush,e),this.samples.length){var i=this.audioCtx.createBufferSource(),n=this.samples.length/this.options.channels,o=this.audioCtx.createBuffer(this.options.channels,n,this.options.sampleRate),s=void 0,r=void 0,a=void 0,u=void 0,h=void 0;for(r=0;r<this.options.channels;r++)for(s=o.getChannelData(r),a=r,h=50,u=0;u<n;u++)s[u]=this.samples[a],u<50&&(s[u]=s[u]*u/50),u>=n-51&&(s[u]=s[u]*h--/50),a+=this.options.channels;this.startTime<this.audioCtx.currentTime&&(this.startTime=this.audioCtx.currentTime),i.buffer=o,i.connect(this.gainNode),i.start(this.startTime);var d=this.feedCounter,l=this.onendedCallback;l&&(i.onended=function(){return l(d)}),this.startTime+=o.duration,this.samples=new Float32Array([]),this.feedCounter=0}},n.prototype.mute=function(t){this.muted=t},n.prototype.setSampleRate=function(t){this.options.sampleRate=t},t.exports=n}})});