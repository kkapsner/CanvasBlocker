/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		window.scope.modifiedWindowAPI = {};
		scope = window.scope.modifiedWindowAPI;
	}
	
	const {hasType, checkerWrapper} = require("./modifiedAPIFunctions");
	
	const windowNames = new WeakMap();
	scope.changedGetters = [
		{
			objectGetters: [function(window){return window;}],
			name: "opener",
			getterGenerator: function(checker){
				const temp = {
					get opener(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							if (!prefs("protectWindow", window.location)){
								return original.apply(this, window.Array.from(args));
							}
							const originalOpener = original.apply(this, window.Array.from(args));
							if (originalOpener !== null){
								notify("fakedWindowReadout");
							}
							return null;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "opener").get;
			}
		},
		{
			objectGetters: [function(window){return window;}],
			name: "name",
			getterGenerator: function(checker){
				const temp = {
					get name(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							if (!prefs("protectWindow", window.location)){
								return original.apply(this, window.Array.from(args));
							}
							const originalName = original.apply(this, window.Array.from(args));
							const returnedName = windowNames.get(window) || "";
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
						original.apply(this, window.Array.from(arguments));
						windowNames.set(window, name);
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "name").set;
			}
		}
	];
	
	function getStatus(obj, status, prefs){
		status = Object.create(status);
		status.active = prefs("protectWindow", status.url) && hasType(status, "readout");
		return status;
	}
	
	scope.changedGetters.forEach(function(changedGetter){
		changedGetter.type = "readout";
		changedGetter.getStatus = getStatus;
		changedGetter.api = "window";
	});
}());