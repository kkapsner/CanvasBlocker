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
		scope = {};
		window.scope.settings = scope;
	}

	var logging = {};
	(function(){
		var loggingQueue = [];
		require.on("./logging", function(realLogging){
			logging = realLogging;
			
			loggingQueue.forEach(function(logEntry){
				logging[logEntry.name](...logEntry.args, logEntry.date);
			});
			loggingQueue = [];
		});
		["error", "warning", "message", "notice", "verbose"].forEach(function(name){
			logging[name] = function(...args){
				loggingQueue.push({name, args, date: new Date()});
			};
		});
	}());
	const settingDefinitions = require("./settingDefinitions.js");
	
	const eventHandler = {any: []};
	eventHandler.all = eventHandler.any;
	const settings = {};

	settingDefinitions.forEach(function(settingDefinition){
		var name = settingDefinition.name;
		settings[name] = settingDefinition.defaultValue;
		eventHandler[name] = [];

		settingDefinition.on = function on(callback){
			scope.on(name, callback);
		};
		settingDefinition.invalid = function invalid(newValue){
			if (settingDefinition.fixed){
				return "fixed";
			}
			else if ((typeof newValue) !== (typeof settingDefinition.defaultValue)){
				return "wrongType";
			}
			else if (
				settingDefinition.options &&
				!settingDefinition.options.includes(newValue)
			){
				return "noOption";
			}
			return false;
		};
		settingDefinition.get = function getValue(){
			return settings[name];
		};
		settingDefinition.set = function setValue(newValue){
			logging.verbose("New value for %s:", name, newValue);
			var invalid = settingDefinition.invalid(newValue);
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
			}
			else {
				settings[name] = newValue;
				if (!settingDefinition.transient){
					var storeObject = {};
					storeObject[name] = newValue;
					browser.storage.local.set(storeObject);
				}
				
			}
		};
		Object.defineProperty(
			scope,
			name,
			{
				get: settingDefinition.get,
				set: settingDefinition.set,
				enumerable: true
			}
		);
	});

	scope.getDefinition = function(name){
		var foundDefinitions = settingDefinitions.filter(function(settingDefinition){
			return name === settingDefinition.name;
		});
		if (foundDefinitions.length){
			return Object.create(foundDefinitions[0]);
		}
		else {
			return undefined;
		}
	};

	scope.forEach = function forEachSetting(...args){
		settingDefinitions.map(function(settingDefinition){
			return Object.create(settingDefinition);
		}).forEach(...args);
	};
	scope.on = function onSettingsChange(name, callback){
		if (Array.isArray(name)){
			name.forEach(function(name){
				onSettingsChange(name, callback);
			});
		}
		else {
			if (eventHandler.hasOwnProperty(name)){
				eventHandler[name].push(callback);
			}
			else {
				logging.warning("Unable to register event handler for unknown setting", name);
			}
		}
	};

	function changeValue(name, newValue){
		var oldValue = settings[name];
		settings[name] = newValue;
		(eventHandler[name] || []).forEach(function(callback){
			callback({name, newValue, oldValue});
		});
	}

	logging.verbose("registering storage onchange listener");
	browser.storage.onChanged.addListener(function(changes, area){
		if (area === "local"){
			logging.notice("settings changed", changes);
			Object.entries(changes).forEach(function(entry){
				const [name, change] = entry;
				changeValue(name, change.newValue);
			});
			eventHandler.any.forEach(function(callback){
				callback();
			});
		}
	});
	
	const settingsMigration = {
		validVersions: [undefined, 0.1, 0.2],
		transitions: {
			"": function(oldStorage){
				return {
					storageVersion: 0.2
				};
			},
			0.1: function(oldStorage){
				var newStorage = {
					storageVersion: 0.2
				};
				if (oldStorage.hasOwnProperty("askOnlyOnce")){
					newStorage.askOnlyOnce = oldStorage.askOnlyOnce? "individual": "no";
				}
				return newStorage;
			}
		}
	};

	logging.verbose("loading settings");
	let initialized = false;
	const initEvents = [];
	scope.init = function(storage){
		if (initialized){
			return false;
		}
		initialized = true;
		logging.message("settings loaded");
		if (!storage.storageVersion){
			logging.message("No storage version found. Initializing storage.");
			browser.storage.local.remove(Object.keys(storage));
			storage = settingsMigration.transitions[""]({});
			browser.storage.local.set(storage);
		}
		else if (storage.storageVersion !== settings.storageVersion){
			var toChange = {};
			while (storage.storageVersion !== settings.storageVersion){
				logging.message("Old storage found. Storage version", storage.storageVersion);
				if (settingsMigration.transitions[storage.storageVersion]){
					var changes = settingsMigration.transitions[storage.storageVersion](storage);
					Object.entries(changes).forEach(function(entry){
						const [name, value] = entry;
						toChange[name] = value;
						storage[name] = value;
					});
				}
				else {
					logging.warning("Unable to migrate storage.");
					break;
				}
			}
			logging.notice("Changed settings:", toChange);
			browser.storage.local.set(toChange);
		}
		Object.entries(storage).forEach(function(entry){
			const [name, value] = entry;
			changeValue(name, value);
		});
		changeValue("isStillDefault", false);

		initEvents.forEach(function(callback){callback();});
		return true;
	};
	scope.loaded = browser.storage.local.get().then(scope.init);
	scope.onloaded = function(callback){
		if (scope.isStillDefault){
			initEvents.push(callback);
		}
		else {
			callback();
		}
	};
	Object.seal(scope);
}());