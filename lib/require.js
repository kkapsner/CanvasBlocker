/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

window.scope = {};
function require(module){
	"use strict";
	if (module.startsWith("./")){
		var scopeName = module.substr(2).replace(/\..+/, "");
		return window.scope[scopeName];
	}
	else if (module === "sdk/getWrapped"){
		return function getWrapped(obj){
			return obj.wrappedJSObject || obj;
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

window.scope.require = require;