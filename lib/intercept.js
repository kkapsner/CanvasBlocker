/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const {changedFunctions, setRandomSupply} = require("./modifiedAPI");
	const randomSupplies = require("./randomSupplies");
	setRandomSupply(randomSupplies.nonPersistent);
	var apiNames = Object.keys(changedFunctions);
	var undef;
	var exportFunction = require("chrome").Cu.exportFunction;
	function setRandomSupplyByType(type){
		switch (type){
			case "persistent":
				setRandomSupply(randomSupplies.persistent);
				break;
			default:
				setRandomSupply(randomSupplies.nonPersistent);
		}
	}
	exports.setRandomSupplyByType = setRandomSupplyByType;
	
	function getURL(window){
		if (!window.location.href || window.location.href === "about:blank"){
			if (window !== window.parent){
				return getURL(window.parent);
			}
			else if (window.opener){
				return getURL(window.opener);
			}
		}
		return window.location.href;
	}
	
	exports.intercept = function intercept({subject: window}, {check, checkStack, ask, notify, prefs}){
		var siteStatus = check({url: getURL(window)});
		if (siteStatus.mode !== "allow"){
			apiNames.forEach(function(name){
				var changedFunction = changedFunctions[name];
				if (changedFunction.getStatus(undefined, siteStatus).active){
					(Array.isArray(changedFunction.object)? changedFunction.object: [changedFunction.object]).forEach(function(object){
						var original = window.wrappedJSObject[object].prototype[name];
					
						Object.defineProperty(
							window.wrappedJSObject[object].prototype,
							name,
							{
								enumerable: true,
								configureable: false,
								get: function(){
									var url = getURL(window);
									if (!url){
										return undef;
									}
									var error = new Error();
									if (checkStack(error.stack)){
										return original;
									}
									var funcStatus = changedFunction.getStatus(this, siteStatus);
									
									if (funcStatus.active){
										if (funcStatus.mode === "ask"){
											funcStatus.mode = ask({window: window, type: changedFunction.type, canvas: this, errorStack: error.stack});
										}
										switch (funcStatus.mode){
											case "allow":
												return original;
											case "fake":
												setRandomSupplyByType(prefs("rng"));
												var fake = changedFunction.fakeGenerator(prefs, function(messageId){
													notify({url, errorStack: error.stack, messageId});
												}, original);
												switch (fake){
													case true:
														return original;
													case false:
														return undef;
													default:
														return exportFunction(fake, window.wrappedJSObject);
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
				}
			});
		}
	};
}());