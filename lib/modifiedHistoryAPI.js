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
		window.scope.modifiedHistoryAPI = {};
		scope = window.scope.modifiedHistoryAPI;
	}
	
	const {hasType, checkerWrapper} = require("./modifiedAPIFunctions");
	
	scope.changedGetters = [
		{
			objectGetters: [function(window){return window.History && window.History.prototype;}],
			name: "length",
			getterGenerator: function(checker){
				const temp = {
					get length(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							const originalLength = original.apply(this, window.Array.from(args));
							const threshold = prefs("historyLengthThreshold", window.location);
							if (originalLength > threshold){
								notify("fakedHistoryReadout");
								return threshold;
							}
							else {
								return originalLength;
							}
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "length").get;
			}
		}
	];
	
	
	function getStatus(obj, status){
		status = Object.create(status);
		status.active = hasType(status, "readout");
		return status;
	}
	
	scope.changedGetters.forEach(function(changedGetter){
		changedGetter.type = "readout";
		changedGetter.getStatus = getStatus;
		changedGetter.api = "history";
	});
}());