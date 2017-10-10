/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const require = function(){
	"use strict";
	window.scope = {};
	const scope = window.scope;
	function require(module){
		if (module.startsWith("./")){
			var scopeName = module.substr(2).replace(/\..+/, "");
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
		else if (module === "sdk/simple-prefs"){
			return {
				prefs: settings,
				on: function(key, callback){
					browser.storage.onChanged.addListener(function(changes, area){
						if (area === "local"){
							if (changes.hasOwnProperty(key)){
								callback(changes[key].newValue);
							}
						}
					});
				}
			};
		}
		throw new ReferenceError("Unable to get non relative module " + module + "!");
	}

	return require;
}();