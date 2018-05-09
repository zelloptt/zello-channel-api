!function(e,t){"object"==typeof exports&&"object"==typeof module?module.exports=t():"function"==typeof define&&define.amd?define([],t):"object"==typeof exports?exports.Widget=t():(e.ZCC=e.ZCC||{},e.ZCC.Widget=t())}(window,function(){return function(e){var t={};function n(r){if(t[r])return t[r].exports;var o=t[r]={i:r,l:!1,exports:{}};return e[r].call(o.exports,o,o.exports,n),o.l=!0,o.exports}return n.m=e,n.c=t,n.d=function(e,t,r){n.o(e,t)||Object.defineProperty(e,t,{configurable:!1,enumerable:!0,get:r})},n.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},n.n=function(e){var t=e&&e.__esModule?function(){return e.default}:function(){return e};return n.d(t,"a",t),t},n.o=function(e,t){return Object.prototype.hasOwnProperty.call(e,t)},n.p="",n(n.s=39)}([function(e,t,n){"use strict";t.__esModule=!0,t.extend=s,t.indexOf=function(e,t){for(var n=0,r=e.length;n<r;n++)if(e[n]===t)return n;return-1},t.escapeExpression=function(e){if("string"!=typeof e){if(e&&e.toHTML)return e.toHTML();if(null==e)return"";if(!e)return e+"";e=""+e}return a.test(e)?e.replace(o,i):e},t.isEmpty=function(e){return!e&&0!==e||!(!u(e)||0!==e.length)},t.createFrame=function(e){var t=s({},e);return t._parent=e,t},t.blockParams=function(e,t){return e.path=t,e},t.appendContextPath=function(e,t){return(e?e+".":"")+t};var r={"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;","=":"&#x3D;"},o=/[&<>"'`=]/g,a=/[&<>"'`=]/;function i(e){return r[e]}function s(e){for(var t=1;t<arguments.length;t++)for(var n in arguments[t])Object.prototype.hasOwnProperty.call(arguments[t],n)&&(e[n]=arguments[t][n]);return e}var c=Object.prototype.toString;t.toString=c;var l=function(e){return"function"==typeof e};l(/x/)&&(t.isFunction=l=function(e){return"function"==typeof e&&"[object Function]"===c.call(e)}),t.isFunction=l;var u=Array.isArray||function(e){return!(!e||"object"!=typeof e)&&"[object Array]"===c.call(e)};t.isArray=u},function(e,t){var n;n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(e){"object"==typeof window&&(n=window)}e.exports=n},function(e,t,n){"use strict";t.__esModule=!0;var r=["description","fileName","lineNumber","message","name","number","stack"];function o(e,t){var n=t&&t.loc,a=void 0,i=void 0;n&&(e+=" - "+(a=n.start.line)+":"+(i=n.start.column));for(var s=Error.prototype.constructor.call(this,e),c=0;c<r.length;c++)this[r[c]]=s[r[c]];Error.captureStackTrace&&Error.captureStackTrace(this,o);try{n&&(this.lineNumber=a,Object.defineProperty?Object.defineProperty(this,"column",{value:i,enumerable:!0}):this.column=i)}catch(e){}}o.prototype=new Error,t.default=o,e.exports=t.default},function(e,t,n){"use strict";e.exports={ERROR_NOT_ENOUGH_PARAMS:"Not enough parameters",ERROR_INVALID_SERVER_PROTOCOL:"Invalid server protocol, use ws:// or wss://",ERROR_UNSUPPORTED:"Your browser does not support all required APIs.\nRead more here https://github.com/zelloptt/zello-channel-api",ERROR_RECORDING_NO_HTTPS:"Recording will work over https:// loaded pages only",ERROR_WIDGET_ELEMENT_NOT_FOUND:"DOM element for widget is not found",EVENT_ERROR:"error",EVENT_CONNECT:"connect",EVENT_CLOSE:"close",EVENT_LOGON:"logon",EVENT_STATUS:"status",EVENT_STREAM_START:"stream_start",EVENT_STREAM_STOP:"stream_stop",EVENT_BUTTON_PRESS:"button_press",EVENT_AUDIO_PACKET_IN:"audio_packet_in",EVENT_START_STREAM:"start_stream",EVENT_STOP_STREAM:"stop_stream"}},,function(e,t,n){e.exports=n(37).default},,function(e,t,n){function r(e){if(e)return function(e){for(var t in r.prototype)e[t]=r.prototype[t];return e}(e)}e.exports=r,r.prototype.on=r.prototype.addEventListener=function(e,t){return this._callbacks=this._callbacks||{},(this._callbacks["$"+e]=this._callbacks["$"+e]||[]).push(t),this},r.prototype.once=function(e,t){function n(){this.off(e,n),t.apply(this,arguments)}return n.fn=t,this.on(e,n),this},r.prototype.off=r.prototype.removeListener=r.prototype.removeAllListeners=r.prototype.removeEventListener=function(e,t){if(this._callbacks=this._callbacks||{},0==arguments.length)return this._callbacks={},this;var n,r=this._callbacks["$"+e];if(!r)return this;if(1==arguments.length)return delete this._callbacks["$"+e],this;for(var o=0;o<r.length;o++)if((n=r[o])===t||n.fn===t){r.splice(o,1);break}return this},r.prototype.emit=function(e){this._callbacks=this._callbacks||{};var t=[].slice.call(arguments,1),n=this._callbacks["$"+e];if(n)for(var r=0,o=(n=n.slice(0)).length;r<o;++r)n[r].apply(this,t);return this},r.prototype.listeners=function(e){return this._callbacks=this._callbacks||{},this._callbacks["$"+e]||[]},r.prototype.hasListeners=function(e){return!!this.listeners(e).length}},function(e,t,n){"use strict";e.exports={libraryName:"ZCC"}},function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),o=n(8),a=function(){function e(){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e)}return r(e,null,[{key:"getLoadedLibrary",value:function(){return!!window&&window[o.libraryName]}}]),e}();e.exports=a},,,,function(e,t,n){"use strict";function r(e){return e&&e.__esModule?e:{default:e}}t.__esModule=!0,t.HandlebarsEnvironment=l;var o=n(0),a=r(n(2)),i=n(36),s=n(28),c=r(n(26));function l(e,t,n){this.helpers=e||{},this.partials=t||{},this.decorators=n||{},i.registerDefaultHelpers(this),s.registerDefaultDecorators(this)}t.VERSION="4.0.11",t.COMPILER_REVISION=7,t.REVISION_CHANGES={1:"<= 1.0.rc.2",2:"== 1.0.0-rc.3",3:"== 1.0.0-rc.4",4:"== 1.x.x",5:"== 2.0.0-alpha.x",6:">= 2.0.0-beta.1",7:">= 4.0.0"},l.prototype={constructor:l,logger:c.default,log:c.default.log,registerHelper:function(e,t){if("[object Object]"===o.toString.call(e)){if(t)throw new a.default("Arg not supported with multiple helpers");o.extend(this.helpers,e)}else this.helpers[e]=t},unregisterHelper:function(e){delete this.helpers[e]},registerPartial:function(e,t){if("[object Object]"===o.toString.call(e))o.extend(this.partials,e);else{if(void 0===t)throw new a.default('Attempting to register a partial called "'+e+'" as undefined');this.partials[e]=t}},unregisterPartial:function(e){delete this.partials[e]},registerDecorator:function(e,t){if("[object Object]"===o.toString.call(e)){if(t)throw new a.default("Arg not supported with multiple decorators");o.extend(this.decorators,e)}else this.decorators[e]=t},unregisterDecorator:function(e){delete this.decorators[e]}};var u=c.default.log;t.log=u,t.createFrame=o.createFrame,t.logger=c.default},,function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),o=function(){function e(){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,e)}return r(e,null,[{key:"getElementByClassName",value:function(e){var t=arguments.length>1&&void 0!==arguments[1]?arguments[1]:null;!t&&document&&(t=document);try{return t.getElementsByClassName(e)[0]}catch(e){return null}}},{key:"getClasses",value:function(e){return!!e&&e.className.split(/\s+/)}},{key:"hasClass",value:function(t,n){return!!t&&-1!==e.getClasses(t).indexOf(n)}},{key:"addClass",value:function(t,n){return!!t&&(e.hasClass(t,n)?void 0:t.className+=" "+n)}},{key:"setClasses",value:function(e,t){if(!e)return!1;e.className=t.join(" ")}},{key:"removeClass",value:function(e,t){if(!e)return!1;e.className=e.className.replace(new RegExp("( |^)"+t+"( |$)"),"$1$2")}}]),e}();e.exports=o},function(e,t){e.exports=function(e){var t="undefined"!=typeof window&&window.location;if(!t)throw new Error("fixUrls requires window.location");if(!e||"string"!=typeof e)return e;var n=t.protocol+"//"+t.host,r=n+t.pathname.replace(/\/[^\/]*$/,"/");return e.replace(/url\s*\(((?:[^)(]|\((?:[^)(]+|\([^)(]*\))*\))*)\)/gi,function(e,t){var o,a=t.trim().replace(/^"(.*)"$/,function(e,t){return t}).replace(/^'(.*)'$/,function(e,t){return t});return/^(#|data:|http:\/\/|https:\/\/|file:\/\/\/|\s*$)/i.test(a)?e:(o=0===a.indexOf("//")?a:0===a.indexOf("/")?n+a:r+a.replace(/^\.\//,""),"url("+JSON.stringify(o)+")")})}},function(e,t,n){var r,o,a={},i=(r=function(){return window&&document&&document.all&&!window.atob},function(){return void 0===o&&(o=r.apply(this,arguments)),o}),s=function(e){var t={};return function(e){if("function"==typeof e)return e();if(void 0===t[e]){var n=function(e){return document.querySelector(e)}.call(this,e);if(window.HTMLIFrameElement&&n instanceof window.HTMLIFrameElement)try{n=n.contentDocument.head}catch(e){n=null}t[e]=n}return t[e]}}(),c=null,l=0,u=[],f=n(16);function d(e,t){for(var n=0;n<e.length;n++){var r=e[n],o=a[r.id];if(o){o.refs++;for(var i=0;i<o.parts.length;i++)o.parts[i](r.parts[i]);for(;i<r.parts.length;i++)o.parts.push(b(r.parts[i],t))}else{var s=[];for(i=0;i<r.parts.length;i++)s.push(b(r.parts[i],t));a[r.id]={id:r.id,refs:1,parts:s}}}}function p(e,t){for(var n=[],r={},o=0;o<e.length;o++){var a=e[o],i=t.base?a[0]+t.base:a[0],s={css:a[1],media:a[2],sourceMap:a[3]};r[i]?r[i].parts.push(s):n.push(r[i]={id:i,parts:[s]})}return n}function h(e,t){var n=s(e.insertInto);if(!n)throw new Error("Couldn't find a style target. This probably means that the value for the 'insertInto' parameter is invalid.");var r=u[u.length-1];if("top"===e.insertAt)r?r.nextSibling?n.insertBefore(t,r.nextSibling):n.appendChild(t):n.insertBefore(t,n.firstChild),u.push(t);else if("bottom"===e.insertAt)n.appendChild(t);else{if("object"!=typeof e.insertAt||!e.insertAt.before)throw new Error("[Style Loader]\n\n Invalid value for parameter 'insertAt' ('options.insertAt') found.\n Must be 'top', 'bottom', or Object.\n (https://github.com/webpack-contrib/style-loader#insertat)\n");var o=s(e.insertInto+" "+e.insertAt.before);n.insertBefore(t,o)}}function v(e){if(null===e.parentNode)return!1;e.parentNode.removeChild(e);var t=u.indexOf(e);t>=0&&u.splice(t,1)}function m(e){var t=document.createElement("style");return void 0===e.attrs.type&&(e.attrs.type="text/css"),g(t,e.attrs),h(e,t),t}function g(e,t){Object.keys(t).forEach(function(n){e.setAttribute(n,t[n])})}function b(e,t){var n,r,o,a;if(t.transform&&e.css){if(!(a=t.transform(e.css)))return function(){};e.css=a}if(t.singleton){var i=l++;n=c||(c=m(t)),r=w.bind(null,n,i,!1),o=w.bind(null,n,i,!0)}else e.sourceMap&&"function"==typeof URL&&"function"==typeof URL.createObjectURL&&"function"==typeof URL.revokeObjectURL&&"function"==typeof Blob&&"function"==typeof btoa?(n=function(e){var t=document.createElement("link");return void 0===e.attrs.type&&(e.attrs.type="text/css"),e.attrs.rel="stylesheet",g(t,e.attrs),h(e,t),t}(t),r=function(e,t,n){var r=n.css,o=n.sourceMap,a=void 0===t.convertToAbsoluteUrls&&o;(t.convertToAbsoluteUrls||a)&&(r=f(r)),o&&(r+="\n/*# sourceMappingURL=data:application/json;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(o))))+" */");var i=new Blob([r],{type:"text/css"}),s=e.href;e.href=URL.createObjectURL(i),s&&URL.revokeObjectURL(s)}.bind(null,n,t),o=function(){v(n),n.href&&URL.revokeObjectURL(n.href)}):(n=m(t),r=function(e,t){var n=t.css,r=t.media;if(r&&e.setAttribute("media",r),e.styleSheet)e.styleSheet.cssText=n;else{for(;e.firstChild;)e.removeChild(e.firstChild);e.appendChild(document.createTextNode(n))}}.bind(null,n),o=function(){v(n)});return r(e),function(t){if(t){if(t.css===e.css&&t.media===e.media&&t.sourceMap===e.sourceMap)return;r(e=t)}else o()}}e.exports=function(e,t){if("undefined"!=typeof DEBUG&&DEBUG&&"object"!=typeof document)throw new Error("The style-loader cannot be used in a non-browser environment");(t=t||{}).attrs="object"==typeof t.attrs?t.attrs:{},t.singleton||"boolean"==typeof t.singleton||(t.singleton=i()),t.insertInto||(t.insertInto="head"),t.insertAt||(t.insertAt="bottom");var n=p(e,t);return d(n,t),function(e){for(var r=[],o=0;o<n.length;o++){var i=n[o];(s=a[i.id]).refs--,r.push(s)}for(e&&d(p(e,t),t),o=0;o<r.length;o++){var s;if(0===(s=r[o]).refs){for(var c=0;c<s.parts.length;c++)s.parts[c]();delete a[s.id]}}}};var y,_=(y=[],function(e,t){return y[e]=t,y.filter(Boolean).join("\n")});function w(e,t,n,r){var o=n?"":r.css;if(e.styleSheet)e.styleSheet.cssText=_(t,o);else{var a=document.createTextNode(o),i=e.childNodes;i[t]&&e.removeChild(i[t]),i.length?e.insertBefore(a,i[t]):e.appendChild(a)}}},function(e,t){e.exports=function(e){var t=[];return t.toString=function(){return this.map(function(t){var n=function(e,t){var n,r=e[1]||"",o=e[3];if(!o)return r;if(t&&"function"==typeof btoa){var a=(n=o,"/*# sourceMappingURL=data:application/json;charset=utf-8;base64,"+btoa(unescape(encodeURIComponent(JSON.stringify(n))))+" */"),i=o.sources.map(function(e){return"/*# sourceURL="+o.sourceRoot+e+" */"});return[r].concat(i).concat([a]).join("\n")}return[r].join("\n")}(t,e);return t[2]?"@media "+t[2]+"{"+n+"}":n}).join("")},t.i=function(e,n){"string"==typeof e&&(e=[[null,e,""]]);for(var r={},o=0;o<this.length;o++){var a=this[o][0];"number"==typeof a&&(r[a]=!0)}for(o=0;o<e.length;o++){var i=e[o];"number"==typeof i[0]&&r[i[0]]||(n&&!i[2]?i[2]=n:n&&(i[2]="("+i[2]+") and ("+n+")"),t.push(i))}},t}},function(e,t,n){(e.exports=n(18)(!1)).push([e.i,".zcc-widget-container {\n  all: initial;\n  display: block;\n  border: 1px solid lightsalmon; }\n\n@keyframes color-sending {\n  0% {\n    background-color: red; }\n  50% {\n    background-color: #980000; }\n  100% {\n    background-color: red; } }\n\n@keyframes color-receiving {\n  0% {\n    background-color: green; }\n  50% {\n    background-color: #004800; }\n  100% {\n    background-color: green; } }\n  .zcc-widget-container .zcc-button-container {\n    all: initial; }\n    .zcc-widget-container .zcc-button-container .zcc-button {\n      all: initial;\n      cursor: pointer;\n      display: inline-block;\n      min-width: 50px;\n      min-height: 50px;\n      width: 50px;\n      height: 50px;\n      border-radius: 30px;\n      background-color: #cccccc;\n      border: 2px solid #949494;\n      box-sizing: border-box; }\n      .zcc-widget-container .zcc-button-container .zcc-button.zcc-receiving {\n        background-color: green;\n        animation-name: color-receiving;\n        animation-duration: 2s;\n        animation-iteration-count: infinite; }\n      .zcc-widget-container .zcc-button-container .zcc-button.zcc-recording {\n        background-color: red;\n        animation-name: color-sending;\n        animation-duration: 2s;\n        animation-iteration-count: infinite; }\n",""])},function(e,t,n){var r=n(19);"string"==typeof r&&(r=[[e.i,r,""]]);n(17)(r,{hmr:!0,transform:void 0,insertInto:void 0}),r.locals&&(e.exports=r.locals)},function(e,t,n){var r=n(5);e.exports=(r.default||r).template({compiler:[7,">= 4.0.0"],main:function(e,t,n,r,o){return'<div class="zcc-channel-message">\n    '+e.escapeExpression(e.lambda(null!=t?t.from:t,t))+"\n</div>\n"},useData:!0})},function(e,t,n){var r=n(5);e.exports=(r.default||r).template({compiler:[7,">= 4.0.0"],main:function(e,t,n,r,o){var a=e.lambda,i=e.escapeExpression;return'<div class="zcc-channel-status zcc-channel-status-'+i(a(null!=t?t.status:t,t))+'">\n    <div class="zcc-online-users-info-container">\n        <span class="zcc-online-users-label">online users:</span>\n        <span class="zcc-online-users-number">'+i(a(null!=t?t.users_online:t,t))+"</span>\n    </div>\n</div>\n"},useData:!0})},function(e,t,n){"use strict";(function(n){t.__esModule=!0,t.default=function(e){var t=void 0!==n?n:window,r=t.Handlebars;e.noConflict=function(){return t.Handlebars===e&&(t.Handlebars=r),e}},e.exports=t.default}).call(this,n(1))},function(e,t,n){"use strict";t.__esModule=!0,t.checkRevision=function(e){var t=e&&e[0]||1,n=i.COMPILER_REVISION;if(t!==n){if(t<n){var r=i.REVISION_CHANGES[n],o=i.REVISION_CHANGES[t];throw new a.default("Template was precompiled with an older version of Handlebars than the current runtime. Please update your precompiler to a newer version ("+r+") or downgrade your runtime to an older version ("+o+").")}throw new a.default("Template was precompiled with a newer version of Handlebars than the current runtime. Please update your runtime to a newer version ("+e[1]+").")}},t.template=function(e,t){if(!t)throw new a.default("No environment passed to template");if(!e||!e.main)throw new a.default("Unknown template object: "+typeof e);e.main.decorator=e.main_d,t.VM.checkRevision(e.compiler);var n={strict:function(e,t){if(!(t in e))throw new a.default('"'+t+'" not defined in '+e);return e[t]},lookup:function(e,t){for(var n=e.length,r=0;r<n;r++)if(e[r]&&null!=e[r][t])return e[r][t]},lambda:function(e,t){return"function"==typeof e?e.call(t):e},escapeExpression:o.escapeExpression,invokePartial:function(n,r,i){i.hash&&(r=o.extend({},r,i.hash),i.ids&&(i.ids[0]=!0)),n=t.VM.resolvePartial.call(this,n,r,i);var s=t.VM.invokePartial.call(this,n,r,i);if(null==s&&t.compile&&(i.partials[i.name]=t.compile(n,e.compilerOptions,t),s=i.partials[i.name](r,i)),null!=s){if(i.indent){for(var c=s.split("\n"),l=0,u=c.length;l<u&&(c[l]||l+1!==u);l++)c[l]=i.indent+c[l];s=c.join("\n")}return s}throw new a.default("The partial "+i.name+" could not be compiled when running in runtime-only mode")},fn:function(t){var n=e[t];return n.decorator=e[t+"_d"],n},programs:[],program:function(e,t,n,r,o){var a=this.programs[e],i=this.fn(e);return t||o||r||n?a=s(this,e,i,t,n,r,o):a||(a=this.programs[e]=s(this,e,i)),a},data:function(e,t){for(;e&&t--;)e=e._parent;return e},merge:function(e,t){var n=e||t;return e&&t&&e!==t&&(n=o.extend({},t,e)),n},nullContext:Object.seal({}),noop:t.VM.noop,compilerInfo:e.compiler};function r(t){var o=arguments.length<=1||void 0===arguments[1]?{}:arguments[1],a=o.data;r._setup(o),!o.partial&&e.useData&&(a=function(e,t){return t&&"root"in t||((t=t?i.createFrame(t):{}).root=e),t}(t,a));var s=void 0,c=e.useBlockParams?[]:void 0;function u(t){return""+e.main(n,t,n.helpers,n.partials,a,c,s)}return e.useDepths&&(s=o.depths?t!=o.depths[0]?[t].concat(o.depths):o.depths:[t]),(u=l(e.main,u,n,o.depths||[],a,c))(t,o)}return r.isTop=!0,r._setup=function(r){r.partial?(n.helpers=r.helpers,n.partials=r.partials,n.decorators=r.decorators):(n.helpers=n.merge(r.helpers,t.helpers),e.usePartial&&(n.partials=n.merge(r.partials,t.partials)),(e.usePartial||e.useDecorators)&&(n.decorators=n.merge(r.decorators,t.decorators)))},r._child=function(t,r,o,i){if(e.useBlockParams&&!o)throw new a.default("must pass block params");if(e.useDepths&&!i)throw new a.default("must pass parent depths");return s(n,t,e[t],r,0,o,i)},r},t.wrapProgram=s,t.resolvePartial=function(e,t,n){return e?e.call||n.name||(n.name=e,e=n.partials[e]):e="@partial-block"===n.name?n.data["partial-block"]:n.partials[n.name],e},t.invokePartial=function(e,t,n){var r=n.data&&n.data["partial-block"];n.partial=!0,n.ids&&(n.data.contextPath=n.ids[0]||n.data.contextPath);var s=void 0;if(n.fn&&n.fn!==c&&function(){n.data=i.createFrame(n.data);var e=n.fn;s=n.data["partial-block"]=function(t){var n=arguments.length<=1||void 0===arguments[1]?{}:arguments[1];return n.data=i.createFrame(n.data),n.data["partial-block"]=r,e(t,n)},e.partials&&(n.partials=o.extend({},n.partials,e.partials))}(),void 0===e&&s&&(e=s),void 0===e)throw new a.default("The partial "+n.name+" could not be found");if(e instanceof Function)return e(t,n)},t.noop=c;var r,o=function(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);return t.default=e,t}(n(0)),a=(r=n(2))&&r.__esModule?r:{default:r},i=n(13);function s(e,t,n,r,o,a,i){function s(t){var o=arguments.length<=1||void 0===arguments[1]?{}:arguments[1],s=i;return!i||t==i[0]||t===e.nullContext&&null===i[0]||(s=[t].concat(i)),n(e,t,e.helpers,e.partials,o.data||r,a&&[o.blockParams].concat(a),s)}return(s=l(n,s,e,i,r,a)).program=t,s.depth=i?i.length:0,s.blockParams=o||0,s}function c(){return""}function l(e,t,n,r,a,i){if(e.decorator){var s={};t=e.decorator(t,s,n,r&&r[0],a,i,r),o.extend(t,s)}return t}},function(e,t,n){"use strict";function r(e){this.string=e}t.__esModule=!0,r.prototype.toString=r.prototype.toHTML=function(){return""+this.string},t.default=r,e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0;var r=n(0),o={methodMap:["debug","info","warn","error"],level:"info",lookupLevel:function(e){if("string"==typeof e){var t=r.indexOf(o.methodMap,e.toLowerCase());e=t>=0?t:parseInt(e,10)}return e},log:function(e){if(e=o.lookupLevel(e),"undefined"!=typeof console&&o.lookupLevel(o.level)<=e){var t=o.methodMap[e];console[t]||(t="log");for(var n=arguments.length,r=Array(n>1?n-1:0),a=1;a<n;a++)r[a-1]=arguments[a];console[t].apply(console,r)}}};t.default=o,e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0;var r=n(0);t.default=function(e){e.registerDecorator("inline",function(e,t,n,o){var a=e;return t.partials||(t.partials={},a=function(o,a){var i=n.partials;n.partials=r.extend({},i,t.partials);var s=e(o,a);return n.partials=i,s}),t.partials[o.args[0]]=o.fn,a})},e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0,t.registerDefaultDecorators=function(e){o.default(e)};var r,o=(r=n(27))&&r.__esModule?r:{default:r}},function(e,t,n){"use strict";t.__esModule=!0;var r=n(0);t.default=function(e){e.registerHelper("with",function(e,t){r.isFunction(e)&&(e=e.call(this));var n=t.fn;if(r.isEmpty(e))return t.inverse(this);var o=t.data;return t.data&&t.ids&&((o=r.createFrame(t.data)).contextPath=r.appendContextPath(t.data.contextPath,t.ids[0])),n(e,{data:o,blockParams:r.blockParams([e],[o&&o.contextPath])})})},e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0,t.default=function(e){e.registerHelper("lookup",function(e,t){return e&&e[t]})},e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0,t.default=function(e){e.registerHelper("log",function(){for(var t=[void 0],n=arguments[arguments.length-1],r=0;r<arguments.length-1;r++)t.push(arguments[r]);var o=1;null!=n.hash.level?o=n.hash.level:n.data&&null!=n.data.level&&(o=n.data.level),t[0]=o,e.log.apply(e,t)})},e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0;var r=n(0);t.default=function(e){e.registerHelper("if",function(e,t){return r.isFunction(e)&&(e=e.call(this)),!t.hash.includeZero&&!e||r.isEmpty(e)?t.inverse(this):t.fn(this)}),e.registerHelper("unless",function(t,n){return e.helpers.if.call(this,t,{fn:n.inverse,inverse:n.fn,hash:n.hash})})},e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0;var r,o=(r=n(2))&&r.__esModule?r:{default:r};t.default=function(e){e.registerHelper("helperMissing",function(){if(1!==arguments.length)throw new o.default('Missing helper: "'+arguments[arguments.length-1].name+'"')})},e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0;var r,o=n(0),a=(r=n(2))&&r.__esModule?r:{default:r};t.default=function(e){e.registerHelper("each",function(e,t){if(!t)throw new a.default("Must pass iterator to #each");var n=t.fn,r=t.inverse,i=0,s="",c=void 0,l=void 0;function u(t,r,a){c&&(c.key=t,c.index=r,c.first=0===r,c.last=!!a,l&&(c.contextPath=l+t)),s+=n(e[t],{data:c,blockParams:o.blockParams([e[t],t],[l+t,null])})}if(t.data&&t.ids&&(l=o.appendContextPath(t.data.contextPath,t.ids[0])+"."),o.isFunction(e)&&(e=e.call(this)),t.data&&(c=o.createFrame(t.data)),e&&"object"==typeof e)if(o.isArray(e))for(var f=e.length;i<f;i++)i in e&&u(i,i,i===e.length-1);else{var d=void 0;for(var p in e)e.hasOwnProperty(p)&&(void 0!==d&&u(d,i-1),d=p,i++);void 0!==d&&u(d,i-1,!0)}return 0===i&&(s=r(this)),s})},e.exports=t.default},function(e,t,n){"use strict";t.__esModule=!0;var r=n(0);t.default=function(e){e.registerHelper("blockHelperMissing",function(t,n){var o=n.inverse,a=n.fn;if(!0===t)return a(this);if(!1===t||null==t)return o(this);if(r.isArray(t))return t.length>0?(n.ids&&(n.ids=[n.name]),e.helpers.each(t,n)):o(this);if(n.data&&n.ids){var i=r.createFrame(n.data);i.contextPath=r.appendContextPath(n.data.contextPath,n.name),n={data:i}}return a(t,n)})},e.exports=t.default},function(e,t,n){"use strict";function r(e){return e&&e.__esModule?e:{default:e}}t.__esModule=!0,t.registerDefaultHelpers=function(e){o.default(e),a.default(e),i.default(e),s.default(e),c.default(e),l.default(e),u.default(e)};var o=r(n(35)),a=r(n(34)),i=r(n(33)),s=r(n(32)),c=r(n(31)),l=r(n(30)),u=r(n(29))},function(e,t,n){"use strict";function r(e){return e&&e.__esModule?e:{default:e}}function o(e){if(e&&e.__esModule)return e;var t={};if(null!=e)for(var n in e)Object.prototype.hasOwnProperty.call(e,n)&&(t[n]=e[n]);return t.default=e,t}t.__esModule=!0;var a=o(n(13)),i=r(n(25)),s=r(n(2)),c=o(n(0)),l=o(n(24)),u=r(n(23));function f(){var e=new a.HandlebarsEnvironment;return c.extend(e,a),e.SafeString=i.default,e.Exception=s.default,e.Utils=c,e.escapeExpression=c.escapeExpression,e.VM=l,e.template=function(t){return l.template(t,e)},e}var d=f();d.create=f,u.default(d),d.default=d,t.default=d,e.exports=t.default},function(e,t,n){var r=n(5);e.exports=(r.default||r).template({1:function(e,t,n,r,o){return'    <div class="zcc-button-container">\n        <button class="zcc-button"></button>\n    </div>\n'},compiler:[7,">= 4.0.0"],main:function(e,t,n,r,o){var a;return'<div class="zcc-widget-container">\n'+(null!=(a=n.if.call(null!=t?t:e.nullContext||{},null!=t?t.recorder:t,{name:"if",hash:{},fn:e.program(1,o,0),inverse:e.noop,data:o}))?a:"")+'    <div class="zcc-status-container"></div>\n    <div class="zcc-message-container">\n        <div class="zcc-message-info-container"></div>\n        <div class="zcc-message-duration-container"></div>\n    </div>\n</div>'},useData:!0})},function(e,t,n){"use strict";var r=function(){function e(e,t){for(var n=0;n<t.length;n++){var r=t[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(e,r.key,r)}}return function(t,n,r){return n&&e(t.prototype,n),r&&e(t,r),t}}(),o=n(7),a=n(3),i=n(38),s=n(22),c=n(21),l=(n(20),n(15)),u=n(9),f=function(e){function t(e){!function(e,t){if(!(e instanceof t))throw new TypeError("Cannot call a class as a function")}(this,t);var n=function(e,t){if(!e)throw new ReferenceError("this hasn't been initialised - super() hasn't been called");return!t||"object"!=typeof t&&"function"!=typeof t?e:t}(this,(t.__proto__||Object.getPrototypeOf(t)).call(this));if(n.options=e,!n.options.widget)throw new Error(a.ERROR_NOT_ENOUGH_PARAMS);if(!n.options.widget.element&&!n.options.widget.headless)throw new Error(a.ERROR_WIDGET_ELEMENT_NOT_FOUND);return n.isHeadless=!!n.options.widget.headless,n.isRecordingAvailable=n.options.recorder,n.element=n.options.widget.element,n.recorderOptions={streamPages:!0,numberOfChannels:1,encoderFrameSize:60,encoderBitRate:16e3,encoderSampleRate:16e3,maxBuffersPerPage:1},n.currentMessageTimer=null,n.currentRecordedMessageId=null,n.currentPacketId=0,n.init(),n}return function(e,t){if("function"!=typeof t&&null!==t)throw new TypeError("Super expression must either be null or a function, not "+typeof t);e.prototype=Object.create(t&&t.prototype,{constructor:{value:e,enumerable:!1,writable:!0,configurable:!0}}),t&&(Object.setPrototypeOf?Object.setPrototypeOf(e,t):e.__proto__=t)}(t,o),r(t,[{key:"initHtml",value:function(){var e=this;this.element.innerHTML=i(this.options),this.button=l.getElementByClassName("zcc-button",this.element),this.statusContainer=l.getElementByClassName("zcc-status-container",this.element),this.messageInfoContainer=l.getElementByClassName("zcc-message-info-container",this.element),this.messageDurationContainer=l.getElementByClassName("zcc-message-duration-container",this.element),this.button&&this.button.addEventListener("click",function(){e.buttonPressHandler()})}},{key:"startMessage",value:function(){var e=this;this.emit(a.EVENT_START_STREAM),this.session.startStream({type:"audio",codec:"opus",codec_header:t.buildCodecHeader(this.recorderOptions.encoderSampleRate,this.recorderOptions.maxBuffersPerPage,this.recorderOptions.encoderFrameSize),packet_duration:60}).then(function(t){e.currentRecordedMessageId=t.stream_id,e.doRecordMessage()}).fail(function(t){e.emit(a.EVENT_ERROR,t)})}},{key:"doRecordMessage",value:function(){var e=this;l.addClass(this.button,"zcc-recording"),this.recorder.onopusdataavailable=function(n){var r=t.buildBinaryPacket(1,e.currentRecordedMessageId,e.currentPacketId,n);e.currentPacketId++,e.session.sendBinary(r)},this.recorder.start()}},{key:"stopRecordMessage",value:function(){l.removeClass(this.button,"zcc-recording"),this.currentRecordedMessageId=null,this.recorder.stop()}},{key:"buttonPressHandler",value:function(){this.emit(a.EVENT_BUTTON_PRESS),this.currentRecordedMessageId?this.stopMessage():this.startMessage()}},{key:"stopMessage",value:function(){var e=this;this.emit(a.EVENT_STOP_STREAM),this.session.stopStream({stream_id:this.currentRecordedMessageId}).then(function(t){e.stopRecordMessage()}).fail(function(t){e.emit(a.EVENT_ERROR,t)})}},{key:"initPlayer",value:function(){var e=this,t=u.getLoadedLibrary();this.decoder=new t.Player.Decoder.OpusToPCM({channels:1,fallback:!0}),this.player=new t.Player.PCMPlayer({encoding:"32bitFloat",channels:1,sampleRate:this.decoder.getSampleRate(),flushingTime:100}),this.decoder.on("decode",function(t){e.player.feed(t)}),this.isRecordingAvailable&&(this.recorder=new t.Recorder(this.recorderOptions))}},{key:"init",value:function(){this.isHeadless||this.initHtml(),this.initPlayer(),this.playOn=!0}},{key:"setSession",value:function(e){var t=this;this.session=e,this.session.on(a.EVENT_STATUS,function(e){t.statusUpdate(e)}),this.session.on(a.EVENT_STREAM_START,function(e){t.incomingMessageStart(e)}),this.session.on(a.EVENT_STREAM_STOP,function(e){t.incomingMessageEnd(e)}),this.session.on(a.EVENT_AUDIO_PACKET_IN,function(e){t.playOn&&t.decoder.decode(e.messageData)})}},{key:"statusUpdate",value:function(e){this.isHeadless||(this.statusContainer.innerHTML=s(e))}},{key:"incomingMessageStart",value:function(e){var n=this,r=Date.now();this.currentMessageTimer=setInterval(function(){var e=Date.now()-r;n.isHeadless||(n.messageDurationContainer.innerHTML=t.getDurationDisplay(e))},100),this.isHeadless||(this.messageInfoContainer.innerHTML=c(e),l.addClass(this.button,"zcc-receiving"))}},{key:"incomingMessageEnd",value:function(){clearInterval(this.currentMessageTimer),this.isHeadless||(this.messageDurationContainer.innerHTML="",this.messageInfoContainer.innerHTML="",l.removeClass(this.button,"zcc-receiving"))}},{key:"pausePlayer",value:function(){this.playOn=!1}},{key:"resumePlayer",value:function(){this.playOn=!0}},{key:"disconnect",value:function(){this.session.disconnect()}},{key:"destroy",value:function(){this.disconnect(),this.element.remove()}}],[{key:"getDurationDisplay",value:function(e){var t=Math.floor(e/36e5),n=Math.floor(e/6e4%60),r=Math.floor(e/1e3%60),o=Math.round(e%1e3/100);return o>=10&&(o=2),t>0&&t<10&&(t="0"+t),n>0&&n<10&&(n="0"+n),r>0&&r<10&&(r="0"+r),t?t+":"+n+":"+r+"."+o:n?n+":"+r+"."+o:r?"00:"+r+"."+o:"00:00."+o}},{key:"buildBinaryPacket",value:function(e,n,r,o){var a=new ArrayBuffer(9),i=new DataView(a);return i.setInt8(0,e),i.setInt32(1,n,!1),i.setInt32(5,r,!1),new Uint8Array(t.arrayBufferConcat(a,o))}},{key:"buildCodecHeader",value:function(e,t,n){var r=new ArrayBuffer(4),o=new DataView(r);return o.setUint16(0,e,!0),o.setUint8(2,t),o.setUint8(3,n),btoa(String.fromCharCode.apply(null,new Uint8Array(r)))}},{key:"arrayBufferConcat",value:function(){var e=0,t=null;for(var n in arguments)e+=(t=arguments[n]).byteLength;var r=new Uint8Array(e),o=0;for(var a in arguments)t=arguments[a],r.set(new Uint8Array(t),o),o+=t.byteLength;return r.buffer}}]),t}();e.exports=f}])});