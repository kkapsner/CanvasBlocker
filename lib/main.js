/* global console */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	require("./stylePreferencePane");
	// require("./disableWithoutDocumentElement");
	const {changedFunctions} = require("./modifiedAPI");
	const {notify} = require("./notifications");
	const lists = require("./lists");

	const sharedFunctions = require("./sharedFunctions");
	// preferences
	
	const observers = require("sdk/system/events");
	const { when: unload } = require("sdk/system/unload");
	
	const preferences = require("sdk/simple-prefs");
	const prefs = preferences.prefs;
	
	function checkURL(url){
		return sharedFunctions.checkURL(url, prefs.blockMode);
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
						if (status === changedFunction.mode){
							var callingStackMsg = sharedFunctions.errorToCallingStackMsg(new Error());
							switch (status){
								case "fakeReadout":
									// notify(window, callingStackMsg);
									return changedFunction.fake;
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