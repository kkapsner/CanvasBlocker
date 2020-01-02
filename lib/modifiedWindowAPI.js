/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./modifiedWindowAPI", {});
	}
	
	const {checkerWrapper, setGetterProperties, getStatusByFlag} = require("./modifiedAPIFunctions");
	
	const windowNames = new WeakMap();
	scope.changedGetters = [
		{
			objectGetters: [function(window){return window;}],
			name: "opener",
			getterGenerator: function(checker){
				const temp = {
					get opener(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {notify, original} = check;
							const originalOpener = original.call(this, ...args);
							if (originalOpener !== null){
								notify("fakedWindowReadout");
							}
							return null;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "opener").get;
			},
			valueGenerator: function({original, notify}){
				if (original !== null){
					notify("fakedWindowReadout");
				}
				return null;
			}
		},
		{
			objectGetters: [function(window){return window;}],
			name: "name",
			getterGenerator: function(checker){
				const temp = {
					get name(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {notify, original, prefs} = check;
							const originalName = original.call(this, ...args);
							if (
								this !== this.top &&
								prefs("allowWindowNameInFrames", this.location)
							){
								return originalName;
							}
							const returnedName = windowNames.get(this) || "";
							if (originalName !== returnedName){
								notify("fakedWindowReadout");
							}
							return returnedName;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "name").get;
			},
			setterGenerator: function(window, original){
				const temp = {
					set name(name){
						original.call(this, ...arguments);
						windowNames.set(this, name);
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "name").set;
			}
		}
	];
	
	setGetterProperties(scope.changedGetters, {
		type: "readout",
		getStatus: getStatusByFlag("protectWindow"),
		api: "window"
	});
}());