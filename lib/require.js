/* global settings exportFunction */
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
	else if (module === "chrome"){
		return {
			Cu: {exportFunction}
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
	else if (module === "sdk/l10n"){
		return {
			get: function(key){
				return browser.i18n.getMessage(key);
			}
		};
	}
	else if (module === "sdk/url"){
		return {
			URL
		};
	}
	throw new ReferenceError("Unable to get non relative module " + module + "!");
}

window.scope.require = require;