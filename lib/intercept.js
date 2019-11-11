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
		scope = require.register("./intercept", {});
	}
	
	const {changedFunctions, changedGetters, setRandomSupply} = require("./modifiedAPI");
	const randomSupplies = require("./randomSupplies");
	const {getWrapped} = require("./modifiedAPIFunctions");
	const logging = require("./logging");
	const settings = require("./settings");
	const extension = require("./extension");

	setRandomSupply(randomSupplies.nonPersistent);
	const apiNames = Object.keys(changedFunctions);
	let undef;
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
	settings.on("rng", function(){
		setRandomSupplyByType(settings.rng);
	});
	
	function getURL(window){
		let href;
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
		return href;
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
					).map(function(name){
						if (name){
							const constructor = getWrapped(window)[name];
							if (constructor){
								return constructor.prototype;
							}
						}
						return false;
					}).concat(
						changedFunction.objectGetters?
							changedFunction.objectGetters.map(function(objectGetter){
								return objectGetter(getWrapped(window));
							}):
							[]
					).forEach(function(object){
						if (object){
							callback({name, object: object});
						}
					});
				});
				changedGetters.forEach(function(changedGetter){
					const name = changedGetter.name;
					changedGetter.objectGetters.forEach(function(objectGetter){
						const object = objectGetter(getWrapped(window));
						if (object){
							callback({name, object});
						}
					});
				});
			};
			let originalPropertyDescriptors = {};
			const doPreIntercept = function(){
				if (!preIntercepted){
					forEachFunction(function({name, object}){
						const map = originalPropertyDescriptors[name] || new WeakMap();
						originalPropertyDescriptors[name] = map;
						
						const originalPropertyDescriptor = Object.getOwnPropertyDescriptor(object, name);
						if (!originalPropertyDescriptor){
							return;
						}
						
						map.set(object, originalPropertyDescriptor);
						Object.defineProperty(
							object,
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
										const descriptor = Object.getOwnPropertyDescriptor(object, name);
										return descriptor.value || descriptor.get.call(this);
									}
									else {
										logging.notice("API blocked (%s)", name);
										const url = getURL(window);
										if (!url){
											return undef;
										}
										const error = new Error();
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
					forEachFunction(function({name, object}){
						const originalPropertyDescriptor = originalPropertyDescriptors[name].get(object);
						if (originalPropertyDescriptor){
							Object.defineProperty(
								object,
								name,
								originalPropertyDescriptor
							);
						}
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
	
	let extensionID = extension.extensionID;
	scope.intercept = function intercept({subject: window}, {check, checkStack, ask, notify, prefs}){
		function getDataURL(object, prefs){
			return (
				object &&
				prefs("storeImageForInspection") &&
				prefs("showNotifications")?
					(
						object instanceof HTMLCanvasElement?
							object.toDataURL():
							(
								object.canvas instanceof HTMLCanvasElement?
									object.canvas.toDataURL():
									false
							)
					):
					false
			);
		}
		function generateChecker(name, changedFunction, siteStatus, original){
			return function checker(callingDepth = 2){
				const error = new Error();
				const errorStack = error.stack;
				
				try {
					// return original if the extension itself requested the function
					if (
						errorStack
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
				if (checkStack(errorStack)){
					return {allow: true, original, window};
				}
				const funcStatus = changedFunction.getStatus(this, siteStatus, prefs);
				
				const This = this;
				function notifyCallback(messageId){
					notify({
						url: getURL(window),
						errorStack,
						messageId,
						timestamp: new Date(),
						functionName: name,
						api: changedFunction.api,
						dataURL: getDataURL(This, prefs)
					});
				}
				const protectedAPIFeatures = prefs("protectedAPIFeatures");
				if (
					funcStatus.active &&
					(
						!protectedAPIFeatures.hasOwnProperty(name + " @ " + changedFunction.api) ||
						protectedAPIFeatures[name + " @ " + changedFunction.api]
					)
				){
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
							errorStack
						});
					}
					switch (funcStatus.mode){
						case "allow":
							return {allow: true, original, window};
						case "fake":
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
		
		const siteStatus = check({url: getURL(window)});
		logging.verbose("status for page", window, siteStatus);
		if (siteStatus.mode !== "allow"){
			apiNames.forEach(function(name){
				const changedFunction = changedFunctions[name];
				const functionStatus = changedFunction.getStatus(undefined, siteStatus, prefs);
				logging.verbose("status for", name, ":", functionStatus);
				if (functionStatus.active){
					(
						Array.isArray(changedFunction.object)?
							changedFunction.object:
							[changedFunction.object]
					).map(function(name){
						if (name){
							const constructor = getWrapped(window)[name];
							if (constructor){
								return constructor.prototype;
							}
						}
						return false;
					}).concat(
						changedFunction.objectGetters?
							changedFunction.objectGetters.map(function(objectGetter){
								return objectGetter(getWrapped(window));
							}):
							[]
					).forEach(function(object){
						if (object){
							const original = object[name];
							const checker = generateChecker(name, changedFunction, siteStatus, original);
							const descriptor = Object.getOwnPropertyDescriptor(object, name);
							if (descriptor){
								if (descriptor.hasOwnProperty("value")){
									if (changedFunction.fakeGenerator){
										descriptor.value = exportFunction(
											changedFunction.fakeGenerator(checker, original, window),
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
								Object.defineProperty(object, name, descriptor);
							}
						}
					});
				}
			});
			changedGetters.forEach(function(changedGetter){
				const name = changedGetter.name;
				const functionStatus = changedGetter.getStatus(undefined, siteStatus, prefs);
				logging.verbose("status for", changedGetter, ":", functionStatus);
				if (functionStatus.active){
					changedGetter.objectGetters.forEach(function(objectGetter){
						const object = objectGetter(getWrapped(window));
						if (object){
							const descriptor = Object.getOwnPropertyDescriptor(object, name);
							if (descriptor && descriptor.hasOwnProperty("get")){
								const original = descriptor.get;
								const checker = generateChecker(name, changedGetter, siteStatus, original);
								const getter = changedGetter.getterGenerator(checker, original, window);
								descriptor.get = exportFunction(getter, window);
								
								if (descriptor.hasOwnProperty("set") && changedGetter.setterGenerator){
									const setter = changedGetter.setterGenerator(window, descriptor.set, prefs);
									descriptor.set = exportFunction(setter, window);
								}
								
								Object.defineProperty(object, name, descriptor);
							}
							else if (
								changedGetter.valueGenerator &&
								descriptor && descriptor.hasOwnProperty("value")
							){
								const protectedAPIFeatures = prefs("protectedAPIFeatures");
								if (
									functionStatus.active &&
									(
										!protectedAPIFeatures.hasOwnProperty(name + " @ " + changedGetter.api) ||
										protectedAPIFeatures[name + " @ " + changedGetter.api]
									)
								){
									switch (functionStatus.mode){
										case "ask": case "block": case "fake":
											descriptor.value = changedGetter.valueGenerator({
												mode: functionStatus.mode,
												original: descriptor.value,
												notify: function notifyCallback(messageId){
													notify({
														url: getURL(window),
														errorStack: (new Error()).stack,
														messageId,
														timestamp: new Date(),
														functionName: name,
														api: changedGetter.api
													});
												}
											});
											Object.defineProperty(object, name, descriptor);
											break;
									}
								}
							}
							else {
								logging.error("Try to fake non getter property:", changedGetter);
							}
						}
					});
				}
			});
		}
	};
}());