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
		window.scope.intercept = {};
		scope = window.scope.intercept;
	}
	
	const {changedFunctions, setRandomSupply} = require("./modifiedAPI");
	const randomSupplies = require("./randomSupplies");
	setRandomSupply(randomSupplies.nonPersistent);
	var apiNames = Object.keys(changedFunctions);
	var undef;
	function setRandomSupplyByType(type){
		switch (type){
			case "persistent":
				setRandomSupply(randomSupplies.persistent);
				break;
			case "constant":
				setRandomSupply(randomSupplies.constant);
				break;
			default:
				setRandomSupply(randomSupplies.nonPersistent);
		}
	}
	scope.setRandomSupplyByType = setRandomSupplyByType;
	
	function getURL(window){
		var href;
		try {
			href = window.location.href;
		}
		catch (e){
			// unable to read location due to SOP
			// since we are not able to do anything in that case we can allow everything
			return "about:SOP";
		}
		if (!href || href === "about:blank"){
			if (window !== window.parent){
				return getURL(window.parent);
			}
			else if (window.opener){
				return getURL(window.opener);
			}
		}
		return window.location.href;
	}
	
	scope.intercept = function intercept({subject: window}, {check, checkStack, ask, notify, prefs}){
		var siteStatus = check({url: getURL(window)});
		if (siteStatus.mode !== "allow"){
			apiNames.forEach(function(name){
				var changedFunction = changedFunctions[name];
				if (changedFunction.getStatus(undefined, siteStatus).active){
					(
						Array.isArray(changedFunction.object)?
							changedFunction.object:
							[changedFunction.object]
					).forEach(function(object){
						var constructor = window.wrappedJSObject[object];
						if (constructor){
							var original = constructor.prototype[name];
						
							Object.defineProperty(
								constructor.prototype,
								name,
								{
									enumerable: true,
									configureable: false,
									get: exportFunction(function(){
										var url = getURL(window);
										if (!url){
											return undef;
										}
										var error = new Error();
										if (checkStack(error.stack)){
											return original;
										}
										var funcStatus = changedFunction.getStatus(this, siteStatus);
										
										function notifyCallback(messageId){
											notify({
												url,
												errorStack: error.stack,
												messageId,
												timestamp: new Date(),
												functionName: name,
												dataURL:
													prefs("storeImageForInspection") &&
													prefs("showNotifications")?
														(
															this instanceof HTMLCanvasElement?
																this.toDataURL():
																(
																	this.canvas instanceof HTMLCanvasElement?
																		this.canvas.toDataURL():
																		false
																)
														):
														false
											});
										}
										
										if (funcStatus.active){
											if (funcStatus.mode === "ask"){
												funcStatus.mode = ask({
													window: window,
													type: changedFunction.type,
													canvas: this,
													errorStack: error.stack
												});
											}
											switch (funcStatus.mode){
												case "allow":
													return original;
												case "fake":
													setRandomSupplyByType(prefs("rng"));
													var fake = changedFunction.fakeGenerator(
														prefs,
														notifyCallback,
														window,
														original
													);
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
									}, window),
									set: exportFunction(function(value){
										Object.defineProperty(
											constructor.prototype,
											name,
											{value}
										);
									}, window)
								}
							);
						}
					});
				}
			});
		}
	};
}());