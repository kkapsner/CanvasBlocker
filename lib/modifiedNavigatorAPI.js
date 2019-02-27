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
		scope = require.register("./modifiedNavigatorAPI", {});
	}
	
	const {checkerWrapper} = require("./modifiedAPIFunctions");
	const navigator = require("./navigator");
	
	scope.changedGetters = navigator.allProperties.map(function(property){
		return {
			objectGetters: [function(window){return window.Navigator && window.Navigator.prototype;}],
			name: property,
			getterGenerator: function(checker){
				const temp = {
					get [property](){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							const originalValue = original.apply(this, window.Array.from(args));
							const returnValue = navigator.getNavigatorValue(property);
							if (originalValue !== returnValue){
								notify("fakedNavigatorReadout");
							}
							return returnValue;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, property).get;
			}
		};
	});
	
	function getStatus(obj, status, prefs){
		status = Object.create(status);
		status.active = prefs("protectNavigator", status.url);
		return status;
	}
	
	scope.changedGetters.forEach(function(changedGetter){
		changedGetter.type = "readout";
		changedGetter.getStatus = getStatus;
		changedGetter.api = "navigator";
	});
}());