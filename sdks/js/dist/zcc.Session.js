!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.Session=e():(t.ZCC=t.ZCC||{},t.ZCC.Session=e())}(window,function(){return function(t){var e={};function n(r){if(e[r])return e[r].exports;var o=e[r]={i:r,l:!1,exports:{}};return t[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=t,n.c=e,n.d=function(t,e,r){n.o(t,e)||Object.defineProperty(t,e,{configurable:!1,enumerable:!0,get:r})},n.r=function(t){Object.defineProperty(t,"__esModule",{value:!0})},n.n=function(t){var e=t&&t.__esModule?function(){return t.default}:function(){return t};return n.d(e,"a",e),e},n.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},n.p="",n(n.s=50)}({1:function(t,e){var n;n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(n=window)}t.exports=n},10:function(t,e,n){(function(t,e){!function(t,n){"use strict";if(!t.setImmediate){var r,o,i,u,c,s=1,a={},f=!1,l=t.document,p=Object.getPrototypeOf&&Object.getPrototypeOf(t);p=p&&p.setTimeout?p:t,"[object process]"==={}.toString.call(t.process)?r=function(t){e.nextTick(function(){d(t)})}:function(){if(t.postMessage&&!t.importScripts){var e=!0,n=t.onmessage;return t.onmessage=function(){e=!1},t.postMessage("","*"),t.onmessage=n,e}}()?(u="setImmediate$"+Math.random()+"$",c=function(e){e.source===t&&"string"==typeof e.data&&0===e.data.indexOf(u)&&d(+e.data.slice(u.length))},t.addEventListener?t.addEventListener("message",c,!1):t.attachEvent("onmessage",c),r=function(e){t.postMessage(u+e,"*")}):t.MessageChannel?((i=new MessageChannel).port1.onmessage=function(t){d(t.data)},r=function(t){i.port2.postMessage(t)}):l&&"onreadystatechange"in l.createElement("script")?(o=l.documentElement,r=function(t){var e=l.createElement("script");e.onreadystatechange=function(){d(t),e.onreadystatechange=null,o.removeChild(e),e=null},o.appendChild(e)}):r=function(t){setTimeout(d,0,t)},p.setImmediate=function(t){"function"!=typeof t&&(t=new Function(""+t));for(var e=new Array(arguments.length-1),n=0;n<e.length;n++)e[n]=arguments[n+1];var o={callback:t,args:e};return a[s]=o,r(s),s++},p.clearImmediate=h}function h(t){delete a[t]}function d(t){if(f)setTimeout(d,0,t);else{var e=a[t];if(e){f=!0;try{!function(t){var e=t.callback,r=t.args;switch(r.length){case 0:e();break;case 1:e(r[0]);break;case 2:e(r[0],r[1]);break;case 3:e(r[0],r[1],r[2]);break;default:e.apply(n,r)}}(e)}finally{h(t),f=!1}}}}}("undefined"==typeof self?void 0===t?this:t:self)}).call(this,n(1),n(4))},11:function(t,e,n){(function(t){var r=void 0!==t&&t||"undefined"!=typeof self&&self||window,o=Function.prototype.apply;function i(t,e){this._id=t,this._clearFn=e}e.setTimeout=function(){return new i(o.call(setTimeout,r,arguments),clearTimeout)},e.setInterval=function(){return new i(o.call(setInterval,r,arguments),clearInterval)},e.clearTimeout=e.clearInterval=function(t){t&&t.close()},i.prototype.unref=i.prototype.ref=function(){},i.prototype.close=function(){this._clearFn.call(r,this._id)},e.enroll=function(t,e){clearTimeout(t._idleTimeoutId),t._idleTimeout=e},e.unenroll=function(t){clearTimeout(t._idleTimeoutId),t._idleTimeout=-1},e._unrefActive=e.active=function(t){clearTimeout(t._idleTimeoutId);var e=t._idleTimeout;e>=0&&(t._idleTimeoutId=setTimeout(function(){t._onTimeout&&t._onTimeout()},e))},n(10),e.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==t&&t.setImmediate||this&&this.setImmediate,e.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==t&&t.clearImmediate||this&&this.clearImmediate}).call(this,n(1))},12:function(t,e,n){(function(e,n){!function(e){"use strict";"function"==typeof bootstrap?bootstrap("promise",e):t.exports=e()}(function(){"use strict";var t=!1;try{throw new Error}catch(e){t=!!e.stack}var r,o=b(),i=function(){},u=function(){var t={task:void 0,next:null},r=t,o=!1,i=void 0,c=!1,s=[];function a(){for(var e,n;t.next;)e=(t=t.next).task,t.task=void 0,(n=t.domain)&&(t.domain=void 0,n.enter()),f(e,n);for(;s.length;)f(e=s.pop());o=!1}function f(t,e){try{t()}catch(t){if(c)throw e&&e.exit(),setTimeout(a,0),e&&e.enter(),t;setTimeout(function(){throw t},0)}e&&e.exit()}if(u=function(t){r=r.next={task:t,domain:c&&e.domain,next:null},o||(o=!0,i())},"object"==typeof e&&"[object process]"===e.toString()&&e.nextTick)c=!0,i=function(){e.nextTick(a)};else if("function"==typeof n)i="undefined"!=typeof window?n.bind(window,a):function(){n(a)};else if("undefined"!=typeof MessageChannel){var l=new MessageChannel;l.port1.onmessage=function(){i=p,l.port1.onmessage=a,a()};var p=function(){l.port2.postMessage(0)};i=function(){setTimeout(a,0),p()}}else i=function(){setTimeout(a,0)};return u.runAfter=function(t){s.push(t),o||(o=!0,i())},u}(),c=Function.call;function s(t){return function(){return c.apply(t,arguments)}}var a,f=s(Array.prototype.slice),l=s(Array.prototype.reduce||function(t,e){var n=0,r=this.length;if(1===arguments.length)for(;;){if(n in this){e=this[n++];break}if(++n>=r)throw new TypeError}for(;n<r;n++)n in this&&(e=t(e,this[n],n));return e}),p=s(Array.prototype.indexOf||function(t){for(var e=0;e<this.length;e++)if(this[e]===t)return e;return-1}),h=s(Array.prototype.map||function(t,e){var n=this,r=[];return l(n,function(o,i,u){r.push(t.call(e,i,u,n))},void 0),r}),d=Object.create||function(t){function e(){}return e.prototype=t,new e},y=Object.defineProperty||function(t,e,n){return t[e]=n.value,t},v=s(Object.prototype.hasOwnProperty),m=Object.keys||function(t){var e=[];for(var n in t)v(t,n)&&e.push(n);return e},k=s(Object.prototype.toString);a="undefined"!=typeof ReturnValue?ReturnValue:function(t){this.value=t};var T="From previous event:";function g(e,n){if(t&&n.stack&&"object"==typeof e&&null!==e&&e.stack){for(var r=[],o=n;o;o=o.source)o.stack&&(!e.__minimumStackCounter__||e.__minimumStackCounter__>o.stackCounter)&&(y(e,"__minimumStackCounter__",{value:o.stackCounter,configurable:!0}),r.unshift(o.stack));r.unshift(e.stack);var i=function(t){for(var e=t.split("\n"),n=[],r=0;r<e.length;++r){var o=e[r];!w(o)&&-1===(i=o).indexOf("(module.js:")&&-1===i.indexOf("(node.js:")&&o&&n.push(o)}var i;return n.join("\n")}(r.join("\n"+T+"\n"));y(e,"stack",{value:i,configurable:!0})}}function _(t){var e=/at .+ \((.+):(\d+):(?:\d+)\)$/.exec(t);if(e)return[e[1],Number(e[2])];var n=/at ([^ ]+):(\d+):(?:\d+)$/.exec(t);if(n)return[n[1],Number(n[2])];var r=/.*@(.+):(\d+)$/.exec(t);return r?[r[1],Number(r[2])]:void 0}function w(t){var e=_(t);if(!e)return!1;var n=e[0],i=e[1];return n===r&&i>=o&&i<=J}function b(){if(t)try{throw new Error}catch(t){var e=t.stack.split("\n"),n=_(e[0].indexOf("@")>0?e[1]:e[2]);if(!n)return;return r=n[0],n[1]}}function E(t){return t instanceof x?t:I(t)?(e=t,n=R(),E.nextTick(function(){try{e.then(n.resolve,n.reject,n.notify)}catch(t){n.reject(t)}}),n.promise):H(t);var e,n}E.resolve=E,E.nextTick=u,E.longStackSupport=!1;var j=1;function R(){var e,n=[],r=[],o=d(R.prototype),i=d(x.prototype);if(i.promiseDispatch=function(t,o,i){var u=f(arguments);n?(n.push(u),"when"===o&&i[1]&&r.push(i[1])):E.nextTick(function(){e.promiseDispatch.apply(e,u)})},i.valueOf=function(){if(n)return i;var t=C(e);return P(t)&&(e=t),t},i.inspect=function(){return e?e.inspect():{state:"pending"}},E.longStackSupport&&t)try{throw new Error}catch(t){i.stack=t.stack.substring(t.stack.indexOf("\n")+1),i.stackCounter=j++}function u(o){e=o,E.longStackSupport&&t&&(i.source=o),l(n,function(t,e){E.nextTick(function(){o.promiseDispatch.apply(o,e)})},void 0),n=void 0,r=void 0}return o.promise=i,o.resolve=function(t){e||u(E(t))},o.fulfill=function(t){e||u(H(t))},o.reject=function(t){e||u(F(t))},o.notify=function(t){e||l(r,function(e,n){E.nextTick(function(){n(t)})},void 0)},o}function O(t){if("function"!=typeof t)throw new TypeError("resolver must be a function.");var e=R();try{t(e.resolve,e.reject,e.notify)}catch(t){e.reject(t)}return e.promise}function S(t){return O(function(e,n){for(var r=0,o=t.length;r<o;r++)E(t[r]).then(e,n)})}function x(t,e,n){void 0===e&&(e=function(t){return F(new Error("Promise does not support operation: "+t))}),void 0===n&&(n=function(){return{state:"unknown"}});var r=d(x.prototype);if(r.promiseDispatch=function(n,o,i){var u;try{u=t[o]?t[o].apply(r,i):e.call(r,o,i)}catch(t){u=F(t)}n&&n(u)},r.inspect=n,n){var o=n();"rejected"===o.state&&(r.exception=o.reason),r.valueOf=function(){var t=n();return"pending"===t.state||"rejected"===t.state?r:t.value}}return r}function N(t,e,n,r){return E(t).then(e,n,r)}function C(t){if(P(t)){var e=t.inspect();if("fulfilled"===e.state)return e.value}return t}function P(t){return t instanceof x}function I(t){return(e=t)===Object(e)&&"function"==typeof t.then;var e}"object"==typeof e&&e&&e.env&&e.env.Q_DEBUG&&(E.longStackSupport=!0),E.defer=R,R.prototype.makeNodeResolver=function(){var t=this;return function(e,n){e?t.reject(e):arguments.length>2?t.resolve(f(arguments,1)):t.resolve(n)}},E.Promise=O,E.promise=O,O.race=S,O.all=G,O.reject=F,O.resolve=E,E.passByCopy=function(t){return t},x.prototype.passByCopy=function(){return this},E.join=function(t,e){return E(t).join(e)},x.prototype.join=function(t){return E([this,t]).spread(function(t,e){if(t===e)return t;throw new Error("Q can't join: not the same: "+t+" "+e)})},E.race=S,x.prototype.race=function(){return this.then(E.race)},E.makePromise=x,x.prototype.toString=function(){return"[object Promise]"},x.prototype.then=function(t,e,n){var r=this,o=R(),i=!1;return E.nextTick(function(){r.promiseDispatch(function(e){i||(i=!0,o.resolve(function(e){try{return"function"==typeof t?t(e):e}catch(t){return F(t)}}(e)))},"when",[function(t){i||(i=!0,o.resolve(function(t){if("function"==typeof e){g(t,r);try{return e(t)}catch(t){return F(t)}}return F(t)}(t)))}])}),r.promiseDispatch(void 0,"when",[void 0,function(t){var e,r=!1;try{e=function(t){return"function"==typeof n?n(t):t}(t)}catch(t){if(r=!0,!E.onerror)throw t;E.onerror(t)}r||o.notify(e)}]),o.promise},E.tap=function(t,e){return E(t).tap(e)},x.prototype.tap=function(t){return t=E(t),this.then(function(e){return t.fcall(e).thenResolve(e)})},E.when=N,x.prototype.thenResolve=function(t){return this.then(function(){return t})},E.thenResolve=function(t,e){return E(t).thenResolve(e)},x.prototype.thenReject=function(t){return this.then(function(){throw t})},E.thenReject=function(t,e){return E(t).thenReject(e)},E.nearer=C,E.isPromise=P,E.isPromiseAlike=I,E.isPending=function(t){return P(t)&&"pending"===t.inspect().state},x.prototype.isPending=function(){return"pending"===this.inspect().state},E.isFulfilled=function(t){return!P(t)||"fulfilled"===t.inspect().state},x.prototype.isFulfilled=function(){return"fulfilled"===this.inspect().state},E.isRejected=function(t){return P(t)&&"rejected"===t.inspect().state},x.prototype.isRejected=function(){return"rejected"===this.inspect().state};var A,M,D,L=[],V=[],U=[],q=!0;function $(){L.length=0,V.length=0,q||(q=!0)}function F(t){var n=x({when:function(n){return n&&function(t){if(q){var n=p(V,t);-1!==n&&("object"==typeof e&&"function"==typeof e.emit&&E.nextTick.runAfter(function(){var r=p(U,t);-1!==r&&(e.emit("rejectionHandled",L[n],t),U.splice(r,1))}),V.splice(n,1),L.splice(n,1))}}(this),n?n(t):this}},function(){return this},function(){return{state:"rejected",reason:t}});return function(t,n){q&&("object"==typeof e&&"function"==typeof e.emit&&E.nextTick.runAfter(function(){-1!==p(V,t)&&(e.emit("unhandledRejection",n,t),U.push(t))}),V.push(t),n&&void 0!==n.stack?L.push(n.stack):L.push("(no stack) "+n))}(n,t),n}function H(t){return x({when:function(){return t},get:function(e){return t[e]},set:function(e,n){t[e]=n},delete:function(e){delete t[e]},post:function(e,n){return null===e||void 0===e?t.apply(void 0,n):t[e].apply(t,n)},apply:function(e,n){return t.apply(e,n)},keys:function(){return m(t)}},void 0,function(){return{state:"fulfilled",value:t}})}function B(t,e,n){return E(t).spread(e,n)}function Q(t,e,n){return E(t).dispatch(e,n)}function G(t){return N(t,function(t){var e=0,n=R();return l(t,function(r,o,i){var u;P(o)&&"fulfilled"===(u=o.inspect()).state?t[i]=u.value:(++e,N(o,function(r){t[i]=r,0==--e&&n.resolve(t)},n.reject,function(t){n.notify({index:i,value:t})}))},void 0),0===e&&n.resolve(t),n.promise})}function Z(t){if(0===t.length)return E.resolve();var e=E.defer(),n=0;return l(t,function(r,o,i){var u=t[i];n++,N(u,function(t){e.resolve(t)},function(t){if(0==--n){var r=t||new Error(""+t);r.message="Q can't get fulfillment value from any promise, all promises were rejected. Last error message: "+r.message,e.reject(r)}},function(t){e.notify({index:i,value:t})})},void 0),e.promise}function z(t){return N(t,function(t){return t=h(t,E),N(G(h(t,function(t){return N(t,i,i)})),function(){return t})})}E.resetUnhandledRejections=$,E.getUnhandledReasons=function(){return L.slice()},E.stopUnhandledRejectionTracking=function(){$(),q=!1},$(),E.reject=F,E.fulfill=H,E.master=function(t){return x({isDef:function(){}},function(e,n){return Q(t,e,n)},function(){return E(t).inspect()})},E.spread=B,x.prototype.spread=function(t,e){return this.all().then(function(e){return t.apply(void 0,e)},e)},E.async=function(t){return function(){function e(t,e){var i;if("undefined"==typeof StopIteration){try{i=n[t](e)}catch(t){return F(t)}return i.done?E(i.value):N(i.value,r,o)}try{i=n[t](e)}catch(t){return function(t){return"[object StopIteration]"===k(t)||t instanceof a}(t)?E(t.value):F(t)}return N(i,r,o)}var n=t.apply(this,arguments),r=e.bind(e,"next"),o=e.bind(e,"throw");return r()}},E.spawn=function(t){E.done(E.async(t)())},E.return=function(t){throw new a(t)},E.promised=function(t){return function(){return B([this,G(arguments)],function(e,n){return t.apply(e,n)})}},E.dispatch=Q,x.prototype.dispatch=function(t,e){var n=this,r=R();return E.nextTick(function(){n.promiseDispatch(r.resolve,t,e)}),r.promise},E.get=function(t,e){return E(t).dispatch("get",[e])},x.prototype.get=function(t){return this.dispatch("get",[t])},E.set=function(t,e,n){return E(t).dispatch("set",[e,n])},x.prototype.set=function(t,e){return this.dispatch("set",[t,e])},E.del=E.delete=function(t,e){return E(t).dispatch("delete",[e])},x.prototype.del=x.prototype.delete=function(t){return this.dispatch("delete",[t])},E.mapply=E.post=function(t,e,n){return E(t).dispatch("post",[e,n])},x.prototype.mapply=x.prototype.post=function(t,e){return this.dispatch("post",[t,e])},E.send=E.mcall=E.invoke=function(t,e){return E(t).dispatch("post",[e,f(arguments,2)])},x.prototype.send=x.prototype.mcall=x.prototype.invoke=function(t){return this.dispatch("post",[t,f(arguments,1)])},E.fapply=function(t,e){return E(t).dispatch("apply",[void 0,e])},x.prototype.fapply=function(t){return this.dispatch("apply",[void 0,t])},E.try=E.fcall=function(t){return E(t).dispatch("apply",[void 0,f(arguments,1)])},x.prototype.fcall=function(){return this.dispatch("apply",[void 0,f(arguments)])},E.fbind=function(t){var e=E(t),n=f(arguments,1);return function(){return e.dispatch("apply",[this,n.concat(f(arguments))])}},x.prototype.fbind=function(){var t=this,e=f(arguments);return function(){return t.dispatch("apply",[this,e.concat(f(arguments))])}},E.keys=function(t){return E(t).dispatch("keys",[])},x.prototype.keys=function(){return this.dispatch("keys",[])},E.all=G,x.prototype.all=function(){return G(this)},E.any=Z,x.prototype.any=function(){return Z(this)},E.allResolved=(A=z,M="allResolved",D="allSettled",function(){return"undefined"!=typeof console&&"function"==typeof console.warn&&console.warn(M+" is deprecated, use "+D+" instead.",new Error("").stack),A.apply(A,arguments)}),x.prototype.allResolved=function(){return z(this)},E.allSettled=function(t){return E(t).allSettled()},x.prototype.allSettled=function(){return this.then(function(t){return G(h(t,function(t){function e(){return t.inspect()}return(t=E(t)).then(e,e)}))})},E.fail=E.catch=function(t,e){return E(t).then(void 0,e)},x.prototype.fail=x.prototype.catch=function(t){return this.then(void 0,t)},E.progress=function(t,e){return E(t).then(void 0,void 0,e)},x.prototype.progress=function(t){return this.then(void 0,void 0,t)},E.fin=E.finally=function(t,e){return E(t).finally(e)},x.prototype.fin=x.prototype.finally=function(t){if(!t||"function"!=typeof t.apply)throw new Error("Q can't apply finally callback");return t=E(t),this.then(function(e){return t.fcall().then(function(){return e})},function(e){return t.fcall().then(function(){throw e})})},E.done=function(t,e,n,r){return E(t).done(e,n,r)},x.prototype.done=function(t,n,r){var o=function(t){E.nextTick(function(){if(g(t,i),!E.onerror)throw t;E.onerror(t)})},i=t||n||r?this.then(t,n,r):this;"object"==typeof e&&e&&e.domain&&(o=e.domain.bind(o)),i.then(void 0,o)},E.timeout=function(t,e,n){return E(t).timeout(e,n)},x.prototype.timeout=function(t,e){var n=R(),r=setTimeout(function(){e&&"string"!=typeof e||((e=new Error(e||"Timed out after "+t+" ms")).code="ETIMEDOUT"),n.reject(e)},t);return this.then(function(t){clearTimeout(r),n.resolve(t)},function(t){clearTimeout(r),n.reject(t)},n.notify),n.promise},E.delay=function(t,e){return void 0===e&&(e=t,t=void 0),E(t).delay(e)},x.prototype.delay=function(t){return this.then(function(e){var n=R();return setTimeout(function(){n.resolve(e)},t),n.promise})},E.nfapply=function(t,e){return E(t).nfapply(e)},x.prototype.nfapply=function(t){var e=R(),n=f(t);return n.push(e.makeNodeResolver()),this.fapply(n).fail(e.reject),e.promise},E.nfcall=function(t){var e=f(arguments,1);return E(t).nfapply(e)},x.prototype.nfcall=function(){var t=f(arguments),e=R();return t.push(e.makeNodeResolver()),this.fapply(t).fail(e.reject),e.promise},E.nfbind=E.denodeify=function(t){if(void 0===t)throw new Error("Q can't wrap an undefined function");var e=f(arguments,1);return function(){var n=e.concat(f(arguments)),r=R();return n.push(r.makeNodeResolver()),E(t).fapply(n).fail(r.reject),r.promise}},x.prototype.nfbind=x.prototype.denodeify=function(){var t=f(arguments);return t.unshift(this),E.denodeify.apply(void 0,t)},E.nbind=function(t,e){var n=f(arguments,2);return function(){var r=n.concat(f(arguments)),o=R();return r.push(o.makeNodeResolver()),E(function(){return t.apply(e,arguments)}).fapply(r).fail(o.reject),o.promise}},x.prototype.nbind=function(){var t=f(arguments,0);return t.unshift(this),E.nbind.apply(void 0,t)},E.nmapply=E.npost=function(t,e,n){return E(t).npost(e,n)},x.prototype.nmapply=x.prototype.npost=function(t,e){var n=f(e||[]),r=R();return n.push(r.makeNodeResolver()),this.dispatch("post",[t,n]).fail(r.reject),r.promise},E.nsend=E.nmcall=E.ninvoke=function(t,e){var n=f(arguments,2),r=R();return n.push(r.makeNodeResolver()),E(t).dispatch("post",[e,n]).fail(r.reject),r.promise},x.prototype.nsend=x.prototype.nmcall=x.prototype.ninvoke=function(t){var e=f(arguments,1),n=R();return e.push(n.makeNodeResolver()),this.dispatch("post",[t,e]).fail(n.reject),n.promise},E.nodeify=function(t,e){return E(t).nodeify(e)},x.prototype.nodeify=function(t){if(!t)return this;this.then(function(e){E.nextTick(function(){t(null,e)})},function(e){E.nextTick(function(){t(e)})})},E.noConflict=function(){throw new Error("Q.noConflict only works when Q is used as a global")};var J=b();return E})}).call(this,n(4),n(11).setImmediate)},3:function(t,e,n){"use strict";t.exports={ERROR_NOT_ENOUGH_PARAMS:"Not enough parameters",ERROR_INVALID_SERVER_PROTOCOL:"Invalid server protocol, use ws:// or wss://",ERROR_UNSUPPORTED:"Your browser does not support all required APIs.\nRead more here https://github.com/zelloptt/zello-channel-api",ERROR_RECORDING_NO_HTTPS:"Recording will work over https:// loaded pages only",ERROR_WIDGET_ELEMENT_NOT_FOUND:"DOM element for widget is not found",EVENT_ERROR:"error",EVENT_CONNECT:"connect",EVENT_CLOSE:"close",EVENT_LOGON:"logon",EVENT_STATUS:"status",EVENT_STREAM_START:"stream_start",EVENT_STREAM_STOP:"stream_stop",EVENT_BUTTON_PRESS:"button_press",EVENT_AUDIO_PACKET_IN:"audio_packet_in",EVENT_START_STREAM:"start_stream",EVENT_STOP_STREAM:"stop_stream"}},4:function(t,e){var n,r,o=t.exports={};function i(){throw new Error("setTimeout has not been defined")}function u(){throw new Error("clearTimeout has not been defined")}function c(t){if(n===setTimeout)return setTimeout(t,0);if((n===i||!n)&&setTimeout)return n=setTimeout,setTimeout(t,0);try{return n(t,0)}catch(e){try{return n.call(null,t,0)}catch(e){return n.call(this,t,0)}}}!function(){try{n="function"==typeof setTimeout?setTimeout:i}catch(t){n=i}try{r="function"==typeof clearTimeout?clearTimeout:u}catch(t){r=u}}();var s,a=[],f=!1,l=-1;function p(){f&&s&&(f=!1,s.length?a=s.concat(a):l=-1,a.length&&h())}function h(){if(!f){var t=c(p);f=!0;for(var e=a.length;e;){for(s=a,a=[];++l<e;)s&&s[l].run();l=-1,e=a.length}s=null,f=!1,function(t){if(r===clearTimeout)return clearTimeout(t);if((r===u||!r)&&clearTimeout)return r=clearTimeout,clearTimeout(t);try{r(t)}catch(e){try{return r.call(null,t)}catch(e){return r.call(this,t)}}}(t)}}function d(t,e){this.fun=t,this.array=e}function y(){}o.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)e[n-1]=arguments[n];a.push(new d(t,e)),1!==a.length||f||c(h)},d.prototype.run=function(){this.fun.apply(null,this.array)},o.title="browser",o.browser=!0,o.env={},o.argv=[],o.version="",o.versions={},o.on=y,o.addListener=y,o.once=y,o.off=y,o.removeListener=y,o.removeAllListeners=y,o.emit=y,o.prependListener=y,o.prependOnceListener=y,o.listeners=function(t){return[]},o.binding=function(t){throw new Error("process.binding is not supported")},o.cwd=function(){return"/"},o.chdir=function(t){throw new Error("process.chdir is not supported")},o.umask=function(){return 0}},50:function(t,e,n){"use strict";var r=function(){function t(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}return function(e,n,r){return n&&t(e.prototype,n),r&&t(e,r),e}}(),o=n(7),i=n(12),u=n(3),c=function(t){function e(t){!function(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}(this,e);var n=function(t,e){if(!t)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!e||"object"!=typeof e&&"function"!=typeof e?t:e}(this,(e.__proto__||Object.getPrototypeOf(e)).call(this));return e.validateInitialParams(t),n.initialParams=t,n.callbacks={},n.wsConnection=null,n.refreshToken=null,n.seq=0,n}return function(t,e){if("function"!=typeof e&&null!==e)throw new TypeError("Super expression must either be null or a function, not "+typeof e);t.prototype=Object.create(e&&e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}}),e&&(Object.setPrototypeOf?Object.setPrototypeOf(t,e):t.__proto__=e)}(e,o),r(e,[{key:"getSeq",value:function(){return++this.seq}},{key:"connect",value:function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:null,n=i.defer();this.wsConnection=new WebSocket(this.initialParams.serverUrl),this.wsConnection.binaryType="arraybuffer";var r=!1;return this.wsConnection.addEventListener("open",function(){return"function"==typeof e&&e.apply(t,[null]),t.emit(u.EVENT_CONNECT),r=!0,n.resolve()}),this.wsConnection.addEventListener("message",function(e){t.wsMessageHandler(e.data)}),this.wsConnection.addEventListener("error",function(o){if(!r)return r=!0,"function"==typeof e&&e.apply(t,[o]),n.reject(o)}),this.wsConnection.addEventListener("close",function(e){t.emit(u.EVENT_CLOSE)}),n.promise}},{key:"logon",value:function(){var t=this,e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:null,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"",r=i.defer(),o={command:"logon",seq:this.getSeq(),channel:this.initialParams.channel};return n?o.refresh_token=n:o.auth_token=this.initialParams.authToken,this.initialParams.listenOnly&&(o.listen_only=!0),this.initialParams.username&&(o.username=this.initialParams.username,o.password=this.initialParams.password),this.sendCommand(o,function(n,o){if(n)return"function"==typeof e&&e.apply(t,[n]),void r.reject(n);"function"==typeof e&&e.apply(t,[null,o]),r.resolve(o)}),r.promise}},{key:"disconnect",value:function(){this.wsConnection.close()}},{key:"wsBinaryDataHandler",value:function(t){this.emit(u.EVENT_AUDIO_PACKET_IN,e.parseIncomingBinaryMessage(t))}},{key:"jsonDataHandler",value:function(t){switch(t&&t.seq&&this.handleCallbacks(t),t.refresh_token&&(this.refreshToken=t.refresh_token),t.command){case"on_channel_status":this.emit(u.EVENT_STATUS,t);break;case"on_stream_start":this.emit(u.EVENT_STREAM_START,t);break;case"on_stream_stop":this.emit(u.EVENT_STREAM_STOP,t)}}},{key:"wsMessageHandler",value:function(t){var e=null;try{e=JSON.parse(t)}catch(t){}return e?this.jsonDataHandler(e):this.wsBinaryDataHandler(t)}},{key:"handleCallbacks",value:function(t){var e=t.error?t.error:null,n=this.callbacks[t.seq];"function"==typeof n&&(n.apply(this,[e,t]),delete this.callbacks[t.seq])}},{key:"sendCommand",value:function(t){var e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;t.seq&&e&&(this.callbacks[t.seq]=e),this.wsConnection.send(JSON.stringify(t))}},{key:"sendBinary",value:function(t){this.wsConnection.send(t)}},{key:"startStream",value:function(t){var e=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;t.seq=this.getSeq(),t.command="start_stream";var r=i.defer();return this.sendCommand(t,function(t,o){if(t)return"function"==typeof n&&n.apply(e,[t]),void r.reject(t);"function"==typeof n&&n.apply(e,[null,o]),r.resolve(o)}),r.promise}},{key:"stopStream",value:function(t){var e=this,n=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;t.seq=this.getSeq(),t.command="stop_stream";var r=i.defer();return this.sendCommand(t,function(t,o){if(t)return"function"==typeof n&&n.apply(e,[t]),void r.reject(t);"function"==typeof n&&n.apply(e,[null,o]),r.resolve(o)}),r.promise}}],[{key:"validateInitialParams",value:function(t){if(!t||!t.serverUrl||!t.authToken||!t.channel||t.username&&!t.password)throw new Error(u.ERROR_NOT_ENOUGH_PARAMS);if(!t.serverUrl.match(/^wss?:\/\//i))throw new Error(u.ERROR_INVALID_SERVER_PROTOCOL)}},{key:"parseIncomingBinaryMessage",value:function(t){var e=new DataView(t.slice(0,9));return{messageData:new Uint8Array(t.slice(9)),messageId:e.getUint32(1,!1),packetId:e.getUint32(5,!1)}}}]),e}();t.exports=c},7:function(t,e,n){function r(t){if(t)return function(t){for(var e in r.prototype)t[e]=r.prototype[e];return t}(t)}t.exports=r,r.prototype.on=r.prototype.addEventListener=function(t,e){return this._callbacks=this._callbacks||{},(this._callbacks["$"+t]=this._callbacks["$"+t]||[]).push(e),this},r.prototype.once=function(t,e){function n(){this.off(t,n),e.apply(this,arguments)}return n.fn=e,this.on(t,n),this},r.prototype.off=r.prototype.removeListener=r.prototype.removeAllListeners=r.prototype.removeEventListener=function(t,e){if(this._callbacks=this._callbacks||{},0==arguments.length)return this._callbacks={},this;var n,r=this._callbacks["$"+t];if(!r)return this;if(1==arguments.length)return delete this._callbacks["$"+t],this;for(var o=0;o<r.length;o++)if((n=r[o])===e||n.fn===e){r.splice(o,1);break}return this},r.prototype.emit=function(t){this._callbacks=this._callbacks||{};var e=[].slice.call(arguments,1),n=this._callbacks["$"+t];if(n)for(var r=0,o=(n=n.slice(0)).length;r<o;++r)n[r].apply(this,e);return this},r.prototype.listeners=function(t){return this._callbacks=this._callbacks||{},this._callbacks["$"+t]||[]},r.prototype.hasListeners=function(t){return!!this.listeners(t).length}}})});