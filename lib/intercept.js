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
	const getWrapped = require("sdk/getWrapped");
	const logging = require("./logging");
	const settings = require("./settings");

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
			case "white":
				setRandomSupply(randomSupplies.white);
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
	
	scope.preIntercept = function preIntercept({subject: window}, apis){
		if (!settings.isStillDefault){
			logging.message("settings already loaded -> no need to pre intercept");
			scope.intercept({subject: window}, apis);
		}
		else  {
			logging.message("settings not loaded -> need to pre intercept");
			let forceLoad = true;
			let preIntercepted = false;
			let intercepted = false;
			const forEachFunction = function(callback){
				apiNames.forEach(function(name){
					const changedFunction = changedFunctions[name];
					(
						Array.isArray(changedFunction.object)?
							changedFunction.object:
							[changedFunction.object]
					).forEach(function(object){
						var constructor = getWrapped(window)[object];
						if (constructor){
							callback({name, changedFunction, constructor});
						}
					});
				});
			};
			let originalPropertyDescriptors = {};
			const doPreIntercept = function(){
				if (!preIntercepted){
					forEachFunction(function({name, constructor}){
						var map = originalPropertyDescriptors[name] || new WeakMap();
						originalPropertyDescriptors[name] = map;
						map.set(constructor, Object.getOwnPropertyDescriptor(constructor.prototype, name));
						Object.defineProperty(
							constructor.prototype,
							name,
							{
								enumerable: true,
								configurable: true,
								get: exportFunction(function(){
									if (forceLoad){
										logging.warning("force load the settings. Calling stack:", (new Error()).stack);
										undoPreIntercept();
										settings.forceLoad();
										doRealIntercept();
										var descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, name);
										return descriptor.value || descriptor.get();
									}
									else {
										logging.notice("API blocked (%s)", name);
										var url = getURL(window);
										if (!url){
											return undef;
										}
										var error = new Error();
										apis.notify({
											url,
											errorStack: error.stack,
											messageId: "preBlock",
											timestamp: new Date(),
											functionName: name,
											dataURL: false
										});
										return;
									}
								}, window),
								set: exportFunction(function(){}, window)
							}
						);
					});
					preIntercepted = true;
				}
			};
			const undoPreIntercept = function(){
				if (preIntercepted){
					preIntercepted = false;
					forEachFunction(function({name, constructor}){
						Object.defineProperty(
							constructor.prototype,
							name,
							originalPropertyDescriptors[name].get(constructor)
						);
					});
				}
			};
			const doRealIntercept = function(){
				if (!intercepted){
					scope.intercept({subject: window}, apis);
					intercepted = true;
				}
			};
			
			doPreIntercept();
			settings.onloaded(function(){
				undoPreIntercept();
				doRealIntercept();
			});
		}
	};
	
	let extensionID = browser.extension.getURL("");
	scope.intercept = function intercept({subject: window}, {check, checkStack, ask, notify, prefs}){
		function getDataURL(object, prefs){
			return (
				this &&
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
			);
		}
		function generateChecker(name, changedFunction, siteStatus, original){
			return function checker(callingDepth = 2){
				var url = getURL(window);
				if (!url){
					return undef;
				}
				var error = new Error();
				try {
					// return original if the extension itself requested the function
					if (
						error.stack
							.split("\n", callingDepth + 2)[callingDepth + 1]
							.split("@", callingDepth + 1)[1]
							.startsWith(extensionID)
					){
						return {allow: true, original, window};
					}
				}
				catch (e) {
					// stack had an unknown form
				}
				if (checkStack(error.stack)){
					return {allow: true, original, window};
				}
				var funcStatus = changedFunction.getStatus(this, siteStatus);
				
				function notifyCallback(messageId){
					notify({
						url,
						errorStack: error.stack,
						messageId,
						timestamp: new Date(),
						functionName: name,
						api: changedFunction.api,
						dataURL: getDataURL(this, prefs)
					});
				}
				
				if (funcStatus.active && !prefs("apiWhiteList")[name]){
					if (funcStatus.mode === "ask"){
						funcStatus.mode = ask({
							window: window,
							type: changedFunction.type,
							api: changedFunction.api,
							canvas: this instanceof HTMLCanvasElement?
								this:
								(
									this &&
									(this.canvas instanceof HTMLCanvasElement)?
										this.canvas:
										false
								),
							errorStack: error.stack
						});
					}
					switch (funcStatus.mode){
						case "allow":
							return {allow: true, original, window};
						case "fake":
							setRandomSupplyByType(prefs("rng"));
							return {
								allow: "fake",
								prefs,
								notify: notifyCallback,
								window,
								original
							};
						//case "block":
						default:
							return {
								allow: false,
								notify: notifyCallback
							};
					}
				}
				else {
					return {allow: true, original, window};
				}
			};
		}
		
		var siteStatus = check({url: getURL(window)});
		logging.verbose("status for page", window, siteStatus);
		if (siteStatus.mode !== "allow"){
			apiNames.forEach(function(name){
				var changedFunction = changedFunctions[name];
				var functionStatus = changedFunction.getStatus(undefined, siteStatus);
				logging.verbose("status for", name, ":", functionStatus);
				if (functionStatus.active){
					(
						Array.isArray(changedFunction.object)?
							changedFunction.object:
							[changedFunction.object]
					).forEach(function(object){
						var constructor = getWrapped(window)[object];
						if (constructor){
							var original = constructor.prototype[name];
							const checker = generateChecker(name, changedFunction, siteStatus, original);
							var descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, name);
							if (descriptor.hasOwnProperty("value")){
								if (changedFunction.fakeGenerator){
									descriptor.value = exportFunction(
										changedFunction.fakeGenerator(checker),
										window
									);
								}
								else {
									descriptor.value = null;
								}
							}
							else {
								descriptor.get = exportFunction(function(){
									return exportFunction(
										changedFunction.fakeGenerator(checker),
										window
									);
								}, window);
							}
							Object.defineProperty(constructor.prototype, name, descriptor);
						}
					});
				}
			});
		}
	};
}());