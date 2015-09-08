/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	require("./stylePreferencePane");
	const {changedFunctions} = require("./modifiedAPI");
	const {notify} = require("./notifications");
	const {ask} = require("./askForPermission");
	const lists = require("./lists");

	const sharedFunctions = require("./sharedFunctions");
	
	const observers = require("sdk/system/events");
	const { when: unload } = require("sdk/system/unload");
	
	const preferences = require("sdk/simple-prefs");
	const prefs = preferences.prefs;
	
	function checkURL(url){
		var match = sharedFunctions.checkURL(url, prefs.blockMode).match(/^(block|allow|fake|ask)(|Readout|Everything|Context)$/);
		if (match){
			return {
				type: (match[2] === "Everything" || match[2] === "")?
					["context", "readout"]:
					[match[2].toLowerCase()],
				mode: match[1]
			};
			
		}
		else {
			return {
				type: ["context", "readout"],
				mode: "block"
			};
		}
		
	}
	
	var apiNames = Object.keys(changedFunctions);
	var undef;
	
	function intercept({subject: window}){
		apiNames.forEach(function(name){
			var changedFunction = changedFunctions[name];
			var original = window.wrappedJSObject[changedFunction.object].prototype[name];
			
			Object.defineProperty(
				window.wrappedJSObject[changedFunction.object].prototype,
				name,
				{
					enumerable: true,
					configureable: false,
					get: function(){
						var status = checkURL(window.location);
						if (status.type.indexOf(changedFunction.type) !== -1){
							var callingStackMsg = sharedFunctions.errorToCallingStackMsg(new Error());
							if (status.mode === "ask"){
								status.mode = ask(window, changedFunction.type, this, callingStackMsg);
							}
							switch (status.mode){
								case "allow":
									return original;
								case "fake":
									notify(window, callingStackMsg);
									return changedFunction.fake || undef;
								//case "block":
								default:
									return undef;
							}
						}
						else {
							return original;
						}
					}
				}
			);
		});
	}
	
	observers.on("content-document-global-created", intercept);
	unload(function(){
		observers.off("content-document-global-created", intercept);
	});
}());