/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	const webExtension = require("sdk/webextension");
	const preferences = require("sdk/simple-prefs");
	const prefs = preferences.prefs;
	// console.log("starting webExtension");
	webExtension.startup().then(function(api){
		api.browser.runtime.onConnect.addListener(function(port){
			var prefNames = Object.keys(prefs);
			// console.log("syncing prefs", prefNames);
			prefNames.forEach(function(name){
				if (!name.startsWith("sdk.")){
					var obj = {};
					obj[name] = prefs[name];
					port.postMessage(obj);
					preferences.on(name, function(){
						obj[name] = prefs[name];
						port.postMessage(obj);
					});
				}
			});
		});
	});
}());