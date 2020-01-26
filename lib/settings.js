/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(require){
	"use strict";

	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./settings", {});
	}

	const logging = require("./logging");
	const extension = require("./extension");
	const settingDefinitions = require("./settingDefinitions");
	const settingContainers = require("./settingContainers");
	const definitionsByName = {};
	const defaultSymbol = "";
	
	const eventHandler = {any: {}};
	eventHandler.any[defaultSymbol] = [];
	eventHandler.all = eventHandler.any;
	const settings = {};

	function isDefinitionInvalid(settingDefinition, newValue){
		if (newValue === undefined && settingDefinition.optional){
			return false;
		}
		else if (settingDefinition.fixed){
			return "fixed";
		}
		else if ((typeof newValue) !== (typeof settingDefinition.defaultValue)){
			return "wrongType";
		}
		else if (Array.isArray(settingDefinition.defaultValue)){
			if (!Array.isArray(newValue)){
				return "wrongType";
			}
			const entriesInvalid = newValue.reduce(function(v, entry){
				v = v || settingDefinition.entries.reduce(function(v, entryDefinition){
					return v || isDefinitionInvalid(entryDefinition, entry[entryDefinition.name]);
				}, false);
				if (!v){
					if (Object.keys(entry).some(function(key){
						return !settingDefinition.entries.some(function(entryDefinition){
							return key === entryDefinition.name;
						});
					})){
						return "noOption";
					}
				}
				return v;
			}, false);
			if (entriesInvalid){
				return entriesInvalid;
			}
		}
		else if (
			settingDefinition.options &&
			!settingDefinition.options.includes(newValue)
		){
			return "noOption";
		}
		return false;
	}

	function createGetter(settingDefinition){
		if (settingDefinition.dynamic){
			return function getValue(){
				return settingDefinition.getter(scope);
			};
		}
		else if (settingDefinition.urlSpecific){
			return function getValue(url){
				if (url){
					const match = settingContainers.getUrlValueContainer(settingDefinition.name, url);
					if (match){
						return match[settingDefinition.name];
					}
				}
				return settings[settingDefinition.name];
			};
		}
		else {
			return function getValue(){
				return settings[settingDefinition.name];
			};
		}
	}
	
	function getDefaultValue(settingDefinition){
		let defaultValue = settingDefinition.defaultValue;
		if ((typeof defaultValue) === "object"){
			if (Array.isArray(defaultValue)){
				return defaultValue.slice();
			}
			else {
				return Object.create(defaultValue);
			}
		}
		return defaultValue;
	}

	function createSetter(settingDefinition){
		if (settingDefinition.dynamic){
			return function setValue(newValue){
				settingDefinition.setter(scope, newValue);
			};
		}
		else {
			const name = settingDefinition.name;
			const isValid = function isValid(newValue){
				const invalid = settingDefinition.invalid(newValue);
				if (invalid){
					if (invalid === "fixed"){
						logging.warning("Trying to set the fixed setting", name, ":", newValue);
					}
					else if (invalid === "wrongType"){
						logging.warning("Wrong type provided for setting", name, ":", newValue);
					}
					else if (invalid === "noOption"){
						logging.warning("Provided value outside specified options for ", name, ":", newValue);
					}
					else {
						logging.warning("Unknown invalid state:", invalid);
					}
					return false;
				}
				return true;
			};
			const storeValue = async function storeValue(newValue){
				logging.verbose("Trying to store new value for %s", name, newValue);
				settings[name] = newValue;
				if (!settingDefinition.transient){
					const storeObject = {};
					storeObject[name] = newValue;
					try {
						await browser.storage.local.set(storeObject);
						logging.verbose("New value stored for %s:", name, newValue);
					}
					catch (error){
						logging.error("Unable to store new value for %s:", name, newValue, error);
						throw error;
					}
				}
				else {
					logging.warning("Transient setting %s cannot be stored.", name);
					throw "Transient setting " + name + " cannot be stored.";
				}
			};
			
			if (settingDefinition.urlSpecific){
				return function setValue(newValue, url){
					logging.verbose("New value for %s (%s):", name, url, newValue);
					if (isValid(newValue)){
						if (url){
							return settingContainers.setUrlValue(name, newValue, url);
						}
						else {
							return storeValue(newValue);
						}
					}
					else{
						logging.warning("Invalid value for %s (%s):", name, url, newValue);
						return Promise.reject("Invalid value for " + name + " (" + url + "): " + newValue);
					}
				};
			}
			else {
				return function setValue(newValue){
					logging.verbose("New value for %s:", name, newValue);
					if (isValid(newValue)){
						return storeValue(newValue);
					}
					else{
						logging.warning("Invalid value for %s:", name, newValue);
						return Promise.reject("Invalid value for " + name + ": " + newValue);
					}
				};
			}
		}
	}

	function createResetter(settingDefinition){
		if (settingDefinition.dynamic){
			return function(){};
		}
		else {
			const name = settingDefinition.name;
			let reset = function(){
				settings[name] = getDefaultValue(settingDefinition);
				browser.storage.local.remove(name);
			};
			if (settingDefinition.urlSpecific){
				return function(url){
					if (url){
						settingContainers.resetUrlValue(name, url);
					}
					else {
						reset();
					}
				};
			}
			else {
				return reset;
			}
		}
	}

	scope.on = function onSettingsChange(name, callback, url){
		if (Array.isArray(name)){
			name.forEach(function(name){
				onSettingsChange(name, callback, url);
			});
		}
		else {
			if (eventHandler.hasOwnProperty(name)){
				if (!url){
					url = defaultSymbol;
				}
				if (!eventHandler[name].hasOwnProperty(url)){
					eventHandler[name][url] = [];
				}
				eventHandler[name][url].push(callback);
			}
			else {
				logging.warning("Unable to register event handler for unknown setting", name);
			}
		}
	};

	settingDefinitions.forEach(function(settingDefinition){
		const name = settingDefinition.name;
		definitionsByName[name] = settingDefinition;
		if (typeof settingDefinition.defaultValue === "function"){
			settingDefinition.defaultValue = settingDefinition.defaultValue();
		}
		settings[name] = getDefaultValue(settingDefinition);
		eventHandler[name] = {};

		settingDefinition.on = function on(callback, url){
			if (!settingDefinition.dynamic){
				 scope.on(name, callback, url);
			}
			if (settingDefinition.dependencies){
				settingDefinition.dependencies.forEach(function(dependency){
					scope.on(dependency, function(){
						callback({name, newValue: settingDefinition.get()});
					}, url);
				});
			}
		};
		settingDefinition.invalid = function invalid(newValue){
			return isDefinitionInvalid(settingDefinition, newValue);
		};
		settingDefinition.get = createGetter(settingDefinition);
		
		settingDefinition.set = createSetter(settingDefinition);
		
		settingDefinition.reset = createResetter(settingDefinition);
		
		if (settingDefinition.urlSpecific){
			if (!settingContainers.urlContainer){
				logging.error("Unable to use url specific settings without url-container");
			}
			else {
				settingDefinition.urlContainer = settingContainers.urlContainer;
				let entry = Object.create(settingDefinition);
				entry.optional = true;
				settingContainers.urlContainer.entries.push(entry);
			}
		}

		Object.defineProperty(
			scope,
			name,
			{
				get: settingDefinition.get,
				set: settingDefinition.set,
				enumerable: true
			}
		);
		
		settingContainers.check(settingDefinition);
	});

	scope.getDefinition = function(name){
		const foundDefinition = definitionsByName[name];
		if (foundDefinition){
			return Object.create(foundDefinition);
		}
		else {
			return undefined;
		}
	};
	
	scope.getContainers = function(){
		return {
			url: Object.create(settingContainers.urlContainer),
			hide: Object.create(settingContainers.hideContainer),
			expand: Object.create(settingContainers.expandContainer)
		};
	};

	scope.set = function(name, ...args){
		const foundDefinition = definitionsByName[name];
		if (foundDefinition){
			return foundDefinition.set(...args);
		}
		else {
			logging.error("Try to set unknown setting:", name);
			return Promise.reject("Try to set unknown setting: " + name);
		}
	};
	scope.get = function(name, ...args){
		const foundDefinition = definitionsByName[name];
		if (foundDefinition){
			return foundDefinition.get(...args);
		}
		else {
			logging.error("Try to get unknown setting:", name);
			return undefined;
		}
	};

	scope.forEach = function forEachSetting(...args){
		settingDefinitions.filter(function(settingDefinition){
			return !settingDefinition.dynamic;
		}).map(function(settingDefinition){
			return Object.create(settingDefinition);
		}).forEach(...args);
	};

	const resetSymbol = Symbol("reset");
	function changeValue(name, newValue){
		const settingDefinition = scope.getDefinition(name);
		if (settingDefinition){
			const oldValue = settings[name];
			if (newValue === resetSymbol){
				newValue = getDefaultValue(settingDefinition);
			}
			settings[name] = newValue;
			((eventHandler[name] || {})[defaultSymbol] || []).forEach(function(callback){
				callback({name, newValue, oldValue});
			});

			if (settingDefinition.urlSpecific){
				settingContainers.urlContainer.get().forEach(function(entry){
					if (!entry.hasOwnProperty(name)){
						((eventHandler[name] || {})[entry.url] || []).forEach(function(callback){
							callback({name, newValue, oldValue, url: entry.url});
						});
					}
				});
			}
		}
	}

	logging.verbose("registering storage onchange listener");
	browser.storage.onChanged.addListener(function(changes, area){
		if (area === "local"){
			logging.notice("settings changed", changes);
			const delayedChange = [];
			Object.entries(changes).forEach(function(entry){
				const [name, change] = entry;
				if (settingContainers.urlContainer && name === settingContainers.urlContainer.name){
					// changes in the url container have to trigger after the other changes
					delayedChange.push(entry);
				}
				else {
					if (change.hasOwnProperty("newValue")){
						changeValue(name, change.newValue);
					}
					else {
						changeValue(name, resetSymbol);
					}
				}
			});
			delayedChange.forEach(function(entry){
				const [name, change] = entry;
				if (change.hasOwnProperty("newValue")){
					changeValue(name, change.newValue);
				}
				else {
					changeValue(name, resetSymbol);
				}
			});
			eventHandler.any[""].forEach(function(callback){
				callback();
			});
		}
	});
	
	settingContainers.initializeUrlContainer(eventHandler);
	
	logging.verbose("loading settings");
	let initialized = false;
	scope.isInitialized = function(){
		return initialized;
	};
	const initEvents = [];
	scope.init = function(storage){
		if (initialized){
			return false;
		}
		initialized = true;
		logging.message("settings loaded");
		if (require("./extension").inBackgroundScript){
			const settingsMigration = require("./settingsMigration");
			settingsMigration.check(
				storage,
				{settings, logging, changeValue, urlContainer: settingContainers.urlContainer}
			);
		}
		const delayedChange = [];
		Object.entries(storage).forEach(function(entry){
			const [name, value] = entry;
			if (settingContainers.urlContainer && name === settingContainers.urlContainer.name){
				// changes in the url container have to trigger after the other changes
				delayedChange.push(entry);
			}
			else {
				changeValue(name, value);
			}
		});
		delayedChange.forEach(function(entry){
			const [name, value] = entry;
			changeValue(name, value);
		});
		changeValue("isStillDefault", false);

		initEvents.forEach(function(callback){callback();});
		return true;
	};
	if (require.exists("./settingsData")){
		scope.init(require("./settingsData"));
		scope.loaded = Promise.resolve(false);
	}
	else {
		scope.loaded = browser.storage.local.get().then(scope.init);
	}
	scope.onloaded = function(callback){
		if (scope.isStillDefault){
			initEvents.push(callback);
		}
		else {
			callback();
		}
	};
	scope.forceLoad = function(){
		while (settings.isStillDefault){
			extension.waitSync("to wait for settings");
			logging.message("settings still default?", settings.isStillDefault);
		}
	};
	scope.startupReset = function(){
		scope.forEach(function(definition){
			if (definition.resetOnStartup){
				definition.set(getDefaultValue(definition));
			}
		});
	};
	Object.seal(scope);
	
	logging.setSettings(scope);
}(require));