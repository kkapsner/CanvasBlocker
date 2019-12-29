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
		scope = require.register("./modifiedHistoryAPI", {});
	}
	
	const {checkerWrapper, setGetterProperties} = require("./modifiedAPIFunctions");
	
	scope.changedGetters = [
		{
			objectGetters: [function(window){return window.History && window.History.prototype;}],
			name: "length",
			getterGenerator: function(checker){
				const temp = {
					get length(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							const originalLength = original.call(this, ...args);
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
		status.active = true;
		return status;
	}
	
	setGetterProperties(scope.changedGetters, {
		type: "readout",
		getStatus: getStatus,
		api: "history"
	});
}());