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
		scope = require.register("./modifiedNavigatorAPI", {});
	}
	
	const {checkerWrapper, setProperties, getStatusByFlag} = require("./modifiedAPIFunctions");
	const extension = require("./extension");
	const navigator = require("./navigator");
	
	let cookieStoreId = false;
	scope.setCookieStoreId = function(newCookieStoreId){
		if (typeof newCookieStoreId === "string"){
			cookieStoreId = (
				newCookieStoreId !== "" &&
				newCookieStoreId !== "firefox-default"
			)? newCookieStoreId: "";
		}
	};
	function getCookieStoreId(){
		while (cookieStoreId === false){
			extension.waitSync("to wait for cookie store id");
		}
		return cookieStoreId;
	}
	
	scope.changedGetters = navigator.allProperties.map(function(property){
		return {
			objectGetters: [function(window){return window.Navigator && window.Navigator.prototype;}],
			name: property,
			getterGenerator: function(checker){
				const temp = {
					get [property](){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {notify, original} = check;
							const originalValue = original.call(this, ...args);
							const returnValue = navigator.getNavigatorValue(property, getCookieStoreId);
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
	
	scope.changedFunctions = {
		estimate: {
			objectGetters: [function(window){return window.StorageManager && window.StorageManager.prototype;}],
			fakeGenerator: function(checker){
				const quota = 10 * 1024 * 1024 * 1024;
				return function estimate(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {notify, original, window} = check;
						const This = this;
						return new window.Promise(async function(resolve, reject){
							try {
								const originalValue = await original.call(This, ...args);
								if (originalValue.quota !== quota){
									originalValue.usage = Math.min(
										quota,
										Math.max(0, quota - (originalValue.quota - originalValue.usage))
									);
									originalValue.quota = quota;
									
									notify("fakedNavigatorReadout");
								}
								resolve(originalValue);
							}
							catch (error){
								reject(error);
							}
						});
					});
				};
			}
		}
	};
	
	setProperties(scope.changedFunctions, scope.changedGetters, {
		type: "readout",
		getStatus: getStatusByFlag("protectNavigator"),
		api: "navigator"
	});
}());