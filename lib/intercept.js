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
	if (!settings.isStillDefault){
		setRandomSupplyByType(settings.rng);
	}
	
	function getURL(windowToProcess){
		let href;
		try {
			href = windowToProcess.location.href;
		}
		catch (error){
			// unable to read location due to SOP
			// since we are not able to do anything in that case we can allow everything
			return "about:SOP";
		}
		if (!href || href === "about:blank"){
			if (windowToProcess !== windowToProcess.parent){
				return getURL(windowToProcess.parent);
			}
			else if (windowToProcess.opener){
				return getURL(windowToProcess.opener);
			}
		}
		return href;
	}
	const getAllFunctionObjects = function(windowToProcess, changedFunction){
		return (
			Array.isArray(changedFunction.object)?
				changedFunction.object:
				[changedFunction.object]
		).map(function(name){
			if (name){
				const constructor = extension.getWrapped(windowToProcess)[name];
				if (constructor){
					return constructor.prototype;
				}
			}
			return false;
		}).concat(
			changedFunction.objectGetters?
				changedFunction.objectGetters.map(function(objectGetter){
					return objectGetter(extension.getWrapped(windowToProcess));
				}):
				[]
		);
	};
	const forEachFunction = function(windowToProcess, callback){
		apiNames.forEach(function(name){
			const changedFunction = changedFunctions[name];
			if (changedFunction.name){
				name = changedFunction.name;
			}
			getAllFunctionObjects(windowToProcess, changedFunction).forEach(function(object){
				if (object){
					callback({name, object: object, changedFunction});
				}
			});
		});
	};
	const forEachGetter = function(windowToProcess, callback){
		changedGetters.forEach(function(changedGetter){
			const name = changedGetter.name;
			changedGetter.objectGetters.forEach(function(changedGetter){
				const object = changedGetter(extension.getWrapped(windowToProcess));
				if (object){
					callback({name, object, objectGetter: changedGetter});
				}
			});
		});
	};
	
	const forEach = function(windowToProcess, callback){
		forEachFunction(windowToProcess, callback);
		forEachGetter(windowToProcess, callback);
	};
	
	const doRealIntercept = function(windowToProcess, apis, state){
		if (!state.intercepted){
			scope.intercept({subject: windowToProcess}, apis);
			state.intercepted = true;
		}
	};
	const doPreIntercept = function(windowToProcess, apis, state){
		const forceLoad = true;
		const originalPropertyDescriptors = {};
		const undoPreIntercept = function(){
			if (state.preIntercepted){
				state.preIntercepted = false;
				forEach(windowToProcess, function({name, object}){
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
		if (!state.preIntercepted){
			forEach(windowToProcess, function({name, object}){
				const map = originalPropertyDescriptors[name] || new WeakMap();
				originalPropertyDescriptors[name] = map;
				
				const originalPropertyDescriptor = Object.getOwnPropertyDescriptor(object, name);
				if (!originalPropertyDescriptor){
					return;
				}
				
				map.set(object, originalPropertyDescriptor);
				const temp = class {
					[`get ${name}`](){
						if (forceLoad){
							logging.warning("force load the settings. Calling stack:", (new Error()).stack);
							undoPreIntercept();
							settings.forceLoad();
							doRealIntercept(windowToProcess, apis, state);
							const descriptor = Object.getOwnPropertyDescriptor(object, name);
							return descriptor.value || descriptor.get.call(this);
						}
						else {
							logging.notice("API blocked (%s)", name);
							const url = getURL(windowToProcess);
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
							return undef;
						}
					}
					[`set ${name}`](newValue){}
				}.prototype;
				Object.defineProperty(
					object,
					name,
					{
						enumerable: true,
						configurable: true,
						get: extension.exportFunctionWithName(temp[`get ${name}`], windowToProcess, `get ${name}`),
						set: extension.exportFunctionWithName(temp[`set ${name}`], windowToProcess, `set ${name}`)
					}
				);
			});
			state.preIntercepted = true;
		}
		return undoPreIntercept;
	};
	
	scope.preIntercept = function preIntercept({subject: windowToProcess}, apis){
		if (!settings.isStillDefault){
			logging.message("settings already loaded -> no need to pre intercept");
			scope.intercept({subject: windowToProcess}, apis);
		}
		else {
			logging.message("settings not loaded -> need to pre intercept");
			
			const state = {
				preIntercepted: false,
				intercepted: false
			};
			
			const undoPreIntercept = doPreIntercept(windowToProcess, apis, state);
			settings.onloaded(function(){
				undoPreIntercept();
				doRealIntercept(windowToProcess, apis, state);
			});
		}
	};

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
	
	let extensionID = extension.extensionID;
	
	function generateChecker({
		name, changedFunction, siteStatus, original,
		window: windowToProcess, prefs, notify, checkStack, ask
	}){
		return function checker(callingDepth = 3){
			const errorStack = (new Error()).stack;
			
			try {
				// return original if the extension itself requested the function
				if (
					errorStack
						.split("\n", callingDepth + 2)[callingDepth + 1]
						.split("@", callingDepth + 1)[1]
						.startsWith(extensionID)
				){
					return {allow: true, original, window: windowToProcess};
				}
			}
			catch (error) {
				// stack had an unknown form
			}
			if (checkStack(errorStack)){
				return {allow: true, original, window: windowToProcess};
			}
			const funcStatus = changedFunction.getStatus(this, siteStatus, prefs);
			
			const This = this;
			function notifyCallback(messageId){
				notify({
					url: getURL(windowToProcess),
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
						window: windowToProcess,
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
						return {allow: true, original, window: windowToProcess};
					case "fake":
						return {
							allow: "fake",
							prefs,
							notify: notifyCallback,
							window: windowToProcess,
							original
						};
					//case "block":
					default:
						return {allow: false, notify: notifyCallback};
				}
			}
			else {
				return {allow: true, original, window: windowToProcess};
			}
		};
	}
	
	function interceptFunctions(windowToProcess, siteStatus, {checkStack, ask, notify, prefs}){
		apiNames.forEach(function(name){
			const changedFunction = changedFunctions[name];
			if (changedFunction.name){
				name = changedFunction.name;
			}
			const functionStatus = changedFunction.getStatus(undefined, siteStatus, prefs);
			logging.verbose("status for", name, ":", functionStatus);
			if (!functionStatus.active) return;
			
			getAllFunctionObjects(windowToProcess, changedFunction).forEach(function(object){
				if (!object) return;
				
				const original = object[name];
				const checker = generateChecker({
					name, changedFunction, siteStatus, original,
					window: windowToProcess, prefs, checkStack, ask, notify
				});
				const descriptor = Object.getOwnPropertyDescriptor(object, name);
				if (!descriptor) return;
				const type = descriptor.hasOwnProperty("value")? "value": "get";
				let changed;
				if (type ==="value"){
					if (changedFunction.fakeGenerator){
						if ((changedFunction.exportOptions || {}).allowCallbacks){
							changed = extension.exportFunctionWithName(
								changedFunction.fakeGenerator(checker, original, windowToProcess),
								windowToProcess,
								original.name
							);
						}
						else {
							const generated = changedFunction.fakeGenerator(checker, original, windowToProcess);
							changed = extension.createProxyFunction(windowToProcess, original, generated);
						}
					}
					else {
						changed = null;
					}
				}
				else {
					changed = extension.createProxyFunction(windowToProcess, original, extension.exportFunctionWithName(
						changedFunction.fakeGenerator(checker),
						windowToProcess,
						original.name
					));
				}
				extension.changeProperty(windowToProcess, changedFunction.api, {
					object, name, type, changed
				});
			});
		});
	}
	function interceptGetters(windowToProcess, siteStatus, {checkStack, ask, notify, prefs}){
		changedGetters.forEach(function(changedGetter){
			const name = changedGetter.name;
			const functionStatus = changedGetter.getStatus(undefined, siteStatus, prefs);
			logging.verbose("status for", changedGetter, ":", functionStatus);
			if (!functionStatus.active) return;
			
			changedGetter.objectGetters.forEach(function(objectGetter){
				const object = objectGetter(extension.getWrapped(windowToProcess));
				if (!object) return;
			
				const descriptor = Object.getOwnPropertyDescriptor(object, name);
				if (!descriptor) return;
				
				if (descriptor.hasOwnProperty("get")){
					const original = descriptor.get;
					const checker = generateChecker({
						name, changedFunction: changedGetter, siteStatus, original,
						window: windowToProcess, prefs, checkStack, ask, notify
					});
					const getter = changedGetter.getterGenerator(checker, original, windowToProcess);
					extension.changeProperty(windowToProcess, changedGetter.api,
						{
							object, name, type: "get",
							changed: extension.createProxyFunction(windowToProcess, original, getter)
						}
					);
					
					if (descriptor.hasOwnProperty("set") && descriptor.set && changedGetter.setterGenerator){
						const original = descriptor.set;
						const setter = changedGetter.setterGenerator(
							windowToProcess,
							original,
							prefs
						);
						extension.changeProperty(windowToProcess, changedGetter.api,
							{
								object, name, type: "set",
								changed: extension.createProxyFunction(windowToProcess, original, setter)
							}
						);
					}
					
				}
				else if (
					changedGetter.valueGenerator &&
					descriptor.hasOwnProperty("value")
				){
					const protectedAPIFeatures = prefs("protectedAPIFeatures");
					if (
						protectedAPIFeatures.hasOwnProperty(name + " @ " + changedGetter.api) &&
						!protectedAPIFeatures[name + " @ " + changedGetter.api]
					){
						return;
					}
					switch (functionStatus.mode){
						case "ask": case "block": case "fake":
							extension.changeProperty(windowToProcess, changedGetter.api, {
								object, name, type: "value",
								changed: changedGetter.valueGenerator({
									mode: functionStatus.mode,
									original: descriptor.value,
									notify: function notifyCallback(messageId){
										notify({
											url: getURL(windowToProcess),
											errorStack: (new Error()).stack,
											messageId,
											timestamp: new Date(),
											functionName: name,
											api: changedGetter.api
										});
									}
								})
							});
							break;
					}
				}
				else {
					logging.error("Try to fake non getter property:", changedGetter);
				}
			});
		});
	}
	scope.intercept = function intercept({subject: windowToProcess}, apis){
		const siteStatus = apis.check({url: getURL(windowToProcess)});
		logging.verbose("status for page", windowToProcess, siteStatus);
		if (siteStatus.mode !== "allow"){
			interceptFunctions(windowToProcess, siteStatus, apis);
			interceptGetters(windowToProcess, siteStatus, apis);
		}
	};
}());