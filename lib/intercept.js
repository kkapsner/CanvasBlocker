/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	const {getChangedFunctions: getChangedFunctions} = require("./modifiedAPI");
	var undef;
	
	exports.intercept = function intercept({subject: window}, {check, ask, notify, prefs, getProfileSeed}){
		// Per window intercept...

		var profileSeed = getProfileSeed();

		// Construct a set of hooked functions which incorporate the profile seed for noise generation.
		var changedFunctions = getChangedFunctions(profileSeed);
		var apiNames = Object.keys(changedFunctions);

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
						if (!window.location.href){
							return undef;
						}
						var error = new Error();
						var status = check({url: window.location.href, errorStack: error.stack});
						if (status.type.indexOf(changedFunction.type) !== -1){
							if (status.mode === "ask"){
								status.mode = ask({window: window, type: changedFunction.type, canvas: this, errorStack: error.stack});
							}
							switch (status.mode){
								case "allow":
									return original;
								case "fake":
									if (changedFunction.fake){
										
										return changedFunction.fake;
									}
									else {
										if (changedFunction.fakeGenerator) {
											return changedFunction.fakeGenerator(prefs, function(){
												notify({url: window.location.href, errorStack: error.stack}, window);
											});
										}
										else {
											return undef;
										}
									}
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
	};
}());