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
		settingDefinition.get = function getValue(){
			return settings[name];
		};
		settingDefinition.set = function setValue(newValue){
			if ((typeof newValue) === (typeof settingDefinition.defaultValue)){
				if (
					!settingDefinition.options ||
					settingDefinition.options.includes(newValue)
				){
					settings[name] = newValue;
					if (!settingDefinition.transient){
						var storeObject = {};
						storeObject[name] = newValue;
						browser.storage.local.set(storeObject);
					}
					
				}
				else {
					logging.warning("Provided value outside specified options for ", name, ":", newValue);
				}
			}
			else {
				logging.warning("Wrong type provided for setting", name, ":", newValue);
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
		if (eventHandler.hasOwnProperty(name)){
			eventHandler[name].push(callback);
		}
		else {
			logging.warning("Unable to register event handler for unknown setting", name);
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

	logging.verbose("loading settings");
	scope.loaded = browser.storage.local.get().then(function(storage){
		logging.message("settings loaded");
		Object.entries(storage).forEach(function(entry){
			const [name, value] = entry;
			changeValue(name, value);
		});
		changeValue("isStillDefault", false);
		
		eventHandler.any.forEach(function(callback){
			callback();
		});
	});
	scope.onloaded = function(callback){
		if (scope.isStillDefault){
			scope.loaded.then(function(){callback();});
		}
		else {
			callback();
		}
	};
	Object.seal(scope);
}());