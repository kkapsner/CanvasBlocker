/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const require = function(){
	"use strict";
	window.scope = {};
	const scope = window.scope;

	function getScopeName(module){
		var scopeName = module.substr(2).replace(/\..+/, "");
		return scopeName;
	}

	function require(module){
		if (module.startsWith("./")){
			var scopeName = getScopeName(module);
			return scope[scopeName];
		}
		else if (module === "sdk/getWrapped"){
			return function getWrapped(obj){
				if (!obj){
					return obj;
				}
				var wrapped;
				try {
					wrapped = obj.wrappedJSObject || obj;
				}
				catch (e){
					require("./logging").error("getWrapped failed for", obj, ":", e);
					wrapped = obj;
				}
				return wrapped;
			};
		}
		throw new ReferenceError("Unable to get non relative module " + module + "!");
	}

	var events = {};
	require.on = function(module, callback){
		var scopeName = getScopeName(module);
		if (scope.hasOwnProperty(scopeName)){
			callback(scope[scopeName]);
		}
		else {
			if (!events.hasOwnProperty(scopeName)){
				events[scopeName] = [];
			}
			events[scopeName].push(callback);
		}
	};
	require.emit = function(module){
		var scopeName = getScopeName(module);
		if (events[scopeName]){
			events[scopeName].forEach(function(callback){
				callback(scope[scopeName]);
			});
			events[scopeName] = [];
		}
	};

	return require;
}();