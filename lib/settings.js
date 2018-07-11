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
	const definitionsByName = {};
	const defaultSymbol = "";
	
	const eventHandler = {any: {}};
	eventHandler.any[defaultSymbol] = [];
	eventHandler.all = eventHandler.any;
	const settings = {};
	let urlContainer;
	let hideContainer;

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
			var entriesInvalid = newValue.reduce(function(v, entry){
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
					var matching = urlContainer.get().filter(function(urlSetting){
						return urlSetting.hasOwnProperty(settingDefinition.name);
					}).filter(function(urlSetting){
						return urlSetting.match(url);
					});
					if (matching.length){
						return matching[0][settingDefinition.name];
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

	function createSetter(settingDefinition){
		if (settingDefinition.dynamic){
			return function setValue(newValue){
				settingDefinition.setter(scope);
			};
		}
		else {
			const name = settingDefinition.name;
			const isValid = function isValid(newValue){
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
					return false;
				}
				return true;
			};
			const storeValue = function storeValue(newValue){
				logging.verbose("Trying to store new value for %s", name, newValue);
				settings[name] = newValue;
				if (!settingDefinition.transient){
					var storeObject = {};
					storeObject[name] = newValue;
					browser.storage.local.set(storeObject).then(function(){
						logging.verbose("New value stored for %s:", name, newValue);
					}, function(err){
						logging.warning("Unable to store new value for %s:", name, newValue, err);
					});
				}
				else {
					logging.warning("Transient setting %s cannot be stored.", name);
				}
			};
			
			if (settingDefinition.urlSpecific){
				return function setValue(newValue, url){
					logging.verbose("New value for %s (%s):", name, url, newValue);
					if (isValid(newValue)){
						if (url){
							var urlContainerValue = urlContainer.get();
							var matching = urlContainerValue.filter(function(urlSetting){
								return urlSetting.match(url);
							});
							if (!matching.length){
								let newEntry = {url};
								newEntry[settingDefinition.name] = newValue;
								urlContainerValue.push(newEntry);
								matching = [newEntry];
							}
							matching[0][settingDefinition.name] = newValue;
							urlContainer.set(urlContainerValue);
						}
						else {
							storeValue(newValue);
						}
					}
					else{
						logging.warning("Invalid value for %s (%s):", name, url, newValue);
					}
				};
			}
			else {
				return function setValue(newValue){
					logging.verbose("New value for %s:", name, newValue);
					if (isValid(newValue)){
						storeValue(newValue);
					}
					else{
						logging.warning("Invalid value for %s:", name, newValue);
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
				settings[name] = settingDefinition.defaultValue;
				browser.storage.local.remove(name);
			};
			if (settingDefinition.urlSpecific){
				return function(url){
					if (url){
						var urlContainerValue = urlContainer.get();
						var matching = urlContainerValue.filter(function(urlSetting){
							return urlSetting.match(url);
						});
						if (matching.length){
							delete matching[0][name];
							if (Object.keys(matching[0]).every(function(key){return key === "url";})){
								urlContainerValue = urlContainerValue.filter(function(urlSetting){
									return urlSetting !== matching[0];
								});
							}
							urlContainer.set(urlContainerValue);
						}
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
		if (settingDefinition.urlContainer){
			urlContainer = settingDefinition;
			settingDefinition.refresh = function(){
				settingDefinition.set(settingDefinition.get());
			};
		}

		var name = settingDefinition.name;
		definitionsByName[name] = settingDefinition;
		if (typeof settingDefinition.defaultValue === "function"){
			settingDefinition.defaultValue = settingDefinition.defaultValue();
		}
		settings[name] = settingDefinition.defaultValue;
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
			if (!urlContainer){
				logging.error("Unable to use url specific settings without url-container");
			}
			else {
				settingDefinition.urlContainer = urlContainer;
				let entry = Object.create(settingDefinition);
				entry.optional = true;
				urlContainer.entries.push(entry);
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
		
		if (settingDefinition.hideContainer){
			hideContainer = settingDefinition;
			let changeListeners = {};
			settingDefinition.setHideByName = function(name, value){
				logging.verbose("set hide of", name, "to", value);
				const hideStore = settingDefinition.get();
				hideStore[name] = value;
				settingDefinition.set(hideStore);
				(changeListeners[name] || []).forEach(function(listener){
					listener(value);
				});
			};
			settingDefinition.getHideByName = function(name){
				const hideStore = settingDefinition.get();
				return hideStore[name] || false;
			};
			settingDefinition.onHideChange = function(name, listener){
				if (!changeListeners[name]){
					changeListeners[name] = [];
				}
				changeListeners[name].push(listener);
			};
			settingDefinition.on(function(event){
				const value = event.newValue;
				Object.keys(value).forEach(function(name){
					if (value[name]){
						(changeListeners[name] || []).forEach(function(listener){
							listener(true);
						});
					}
				});
			});
			settingDefinition.hideAble = false;
		}
	});

	scope.getDefinition = function(name){
		var foundDefinition = definitionsByName[name];
		if (foundDefinition){
			return Object.create(foundDefinition);
		}
		else {
			return undefined;
		}
	};
	
	scope.getContainers = function(){
		return {
			url: Object.create(urlContainer),
			hide: Object.create(hideContainer)
		};
	};

	scope.set = function(name, ...args){
		var foundDefinition = definitionsByName[name];
		if (foundDefinition){
			return foundDefinition.set(...args);
		}
		else {
			logging.error("Try to set unkown setting:", name);
		}
	};
	scope.get = function(name, ...args){
		var foundDefinition = definitionsByName[name];
		if (foundDefinition){
			return foundDefinition.get(...args);
		}
		else {
			logging.error("Try to get unkown setting:", name);
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
		var settingDefinition = scope.getDefinition(name);
		if (settingDefinition){
			var oldValue = settings[name];
			if (newValue === resetSymbol){
				newValue = settingDefinition.defaultValue;
			}
			settings[name] = newValue;
			((eventHandler[name] || {})[defaultSymbol] || []).forEach(function(callback){
				callback({name, newValue, oldValue});
			});

			if (settingDefinition.urlSpecific){
				urlContainer.get().forEach(function(entry){
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
			var delayedChange = [];
			Object.entries(changes).forEach(function(entry){
				const [name, change] = entry;
				if (urlContainer && name === urlContainer.name){
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
	
	if (urlContainer){
		urlContainer.on(function({newValue, oldValue}){
			newValue.forEach(function(urlSetting){
				var regExp;
				var domain = !!urlSetting.url.match(/^[\w.]+$/);
				if (domain){
					regExp = new RegExp(
						"(?:^|\\.)" + urlSetting.url.replace(/([\\+*?[^\]$(){}=!|.])/g, "\\$1") + "\\.?$",
						"i"
					);
				}
				else {
					regExp = new RegExp(urlSetting.url, "i");
				}
				const match = function(url){
					if (!url){
						return false;
					}
					else if (
						url instanceof String ||
						(typeof url) === "string"
					){
						return url === urlSetting.url;
					}
					else if (domain){
						return (url.hostname || "").match(regExp);
					}
					else {
						return url.href.match(regExp);
					}
				};
				Object.defineProperty(
					urlSetting,
					"match",
					{
						enumerable: false,
						writable: true,
						configurable: true,
						value: match
					}
				);
			});

			var newUrls = newValue.map(function(entry){return entry.url;});
			var oldUrls = oldValue.map(function(entry){return entry.url;});
			var matching = {};
			newUrls.forEach(function(url, i){
				matching[url] = {new: i, old: oldUrls.indexOf(url)};
			});
			oldUrls.forEach(function(url, i){
				if (!matching[url]){
					matching[url] = {new: -1, old: i};
				}
			});
			Object.keys(matching).forEach(function(url){
				var oldEntry = oldValue[matching[url].old] || {};
				var newEntry = newValue[matching[url].new] || {};
				urlContainer.entries.forEach(function(settingDefinition){
					var name = settingDefinition.name;
					var oldValue = oldEntry[name];
					var newValue = newEntry[name];

					if (oldValue !== newValue){
						((eventHandler[name] || {})[url] || []).forEach(function(callback){
							callback({name, newValue, oldValue, url});
						});
					}
				});
			});
		});
	}
	
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
			},
			0.2: function(oldStorage){
				var newStorage = {
					storageVersion: 0.3,
					urlSettings: (
						oldStorage.urlSettings &&
						 Array.isArray(oldStorage.urlSettings)
					)? oldStorage.urlSettings: []
				};

				var urlSettings = {};

				(oldStorage.blackList || "").split(",")
					.map(function(url){return url.trim();})
					.filter(function(url){return !!url;})
					.forEach(function(url){
						var entry = urlSettings[url];
						if (!entry){
							entry = {url, blockMode: "block"};
							urlSettings[url] = entry;
							newStorage.urlSettings.push(entry);
						}
					});
				(oldStorage.whiteList || "").split(",")
					.map(function(url){return url.trim();})
					.filter(function(url){return !!url;})
					.forEach(function(url){
						var entry = urlSettings[url];
						if (!entry){
							entry = {url, blockMode: "allow"};
							urlSettings[url] = entry;
							newStorage.urlSettings.push(entry);
						}
					});
				(oldStorage.ignoreList || "").split(",")
					.map(function(url){return url.trim();})
					.filter(function(url){return !!url;})
					.forEach(function(url){
						var entry = urlSettings[url];
						if (!entry){
							entry = {url, showNotifications: false};
							urlSettings[url] = entry;
							newStorage.urlSettings.push(entry);
						}
						else {
							entry.showNotifications = false;
						}
					});
				["whiteList", "blackList", "ignoreList"].forEach(function(list){
					if (oldStorage.hasOwnProperty(list)){
						newStorage[list] = "";
					}
				});

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
		var delayedChange = [];
		Object.entries(storage).forEach(function(entry){
			const [name, value] = entry;
			if (urlContainer && name === urlContainer.name){
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
	scope.loaded = browser.storage.local.get().then(scope.init);
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
			logging.message("Starting synchronous request to wait for settings.");
			try {
				let xhr = new XMLHttpRequest();
				xhr.open("GET", "https://[::]", false);
				xhr.send();
				xhr = null;
			}
			catch (e){
				logging.verbose("Error in XHR:", e);
			}
			logging.message("settings still default?", settings.isStillDefault);
		}
	};
	Object.seal(scope);
}());