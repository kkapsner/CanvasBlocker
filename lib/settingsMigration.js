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
		scope = require.register("./settingsMigration", {});
	}
	
	const settingDefinitions = require("./settingDefinitions");
	
	scope.validVersions = [undefined, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 1.0];
	scope.transitions = {
		"": function(){
			return {
				storageVersion: 1.0
			};
		},
		0.1: function(oldStorage){
			const newStorage = {
				storageVersion: 0.2
			};
			if (oldStorage.hasOwnProperty("askOnlyOnce")){
				newStorage.askOnlyOnce = oldStorage.askOnlyOnce? "individual": "no";
			}
			return newStorage;
		},
		0.2: function(oldStorage){
			const newStorage = {
				storageVersion: 0.3,
				urlSettings: (
					oldStorage.urlSettings &&
						Array.isArray(oldStorage.urlSettings)
				)? oldStorage.urlSettings: []
			};

			const urlSettings = {};
			
			[
				{listName: "blackList", property: "blockMode", value: "block"},
				{listName: "whiteList", property: "blockMode", value: "allow"},
				{listName: "ignoreList", property: "showNotifications", value: false}
			].forEach(function(listAction){
				(oldStorage[listAction.listName] || "").split(",")
					.map(function(url){return url.trim();})
					.filter(function(url){return !!url;})
					.forEach(function(url){
						let entry = urlSettings[url];
						if (!entry){
							entry = {url, [listAction.property]: listAction.value};
							urlSettings[url] = entry;
							newStorage.urlSettings.push(entry);
						}
						else {
							entry[listAction.property] = listAction.value;
						}
					});
			});
			
			["whiteList", "blackList", "ignoreList"].forEach(function(list){
				if (oldStorage.hasOwnProperty(list)){
					newStorage[list] = "";
				}
			});

			return newStorage;
		},
		0.3: function(oldStorage){
			const newStorage = {
				storageVersion: 0.4
			};
			if (oldStorage.hasOwnProperty("apiWhiteList")){
				const protectedAPIFeatures = {};
				Object.keys(oldStorage.apiWhiteList).forEach(function(key){
					protectedAPIFeatures[key] = !oldStorage.apiWhiteList[key];
				});
				newStorage.protectedAPIFeatures = protectedAPIFeatures;
			}
			return newStorage;
		},
		0.4: function(oldStorage){
			const newStorage = {
				storageVersion: 0.5
			};
			
			if (oldStorage.hasOwnProperty("blockMode")){
				switch (oldStorage.blockMode){
					case "blockReadout":
						newStorage.blockMode = "block";
						newStorage.protectedCanvasPart = "readout";
						break;
					case "fakeReadout":
						newStorage.blockMode = "fake";
						newStorage.protectedCanvasPart = "readout";
						break;
					case "fakeInput":
						newStorage.blockMode = "fake";
						newStorage.protectedCanvasPart = "input";
						break;
					case "askReadout":
						newStorage.blockMode = "ask";
						newStorage.protectedCanvasPart = "readout";
						break;
					case "blockEverything":
					case "block":
					case "ask":
					case "allow":
					case "allowEverything":
						newStorage.protectedCanvasPart = "everything";
						break;
				}
			}
			return newStorage;
		},
		0.5: function(oldStorage){
			const newStorage = {
				storageVersion: 0.6
			};
			
			if (oldStorage.hasOwnProperty("protectedAPIFeatures")){
				const protectedAPIFeatures = {};
				const protectedAPIFeaturesKeys = settingDefinitions.filter(function(definition){
					return definition.name === "protectedAPIFeatures";
				})[0].keys.filter(function(key){
					return typeof key === "string";
				});
				Object.keys(oldStorage.protectedAPIFeatures).forEach(function(key){
					const matchingKeys = protectedAPIFeaturesKeys.filter(function(definedKey){
						return definedKey.startsWith(key);
					});
					if (matchingKeys.length){
						protectedAPIFeatures[matchingKeys[0]] = oldStorage.protectedAPIFeatures[key];
					}
				});
				newStorage.protectedAPIFeatures = protectedAPIFeatures;
			}
			return newStorage;
		},
		0.6: function (oldStorage){
			const newStorage = {
				storageVersion: 1.0
			};
			if (
				oldStorage.hasOwnProperty("protectWindow") &&
				oldStorage.protectWindow &&
				oldStorage.hasOwnProperty("urlSettings") &&
				Array.isArray(oldStorage.urlSettings) &&
				oldStorage.urlSettings.filter(function(entry){
					return entry.url === "^https://www\\.google\\.com/recaptcha/api2/(?:b?frame|anchor).*$";
				}).some(function(entry){
					return entry.protectWindow === false;
				})
			){
				newStorage.allowWindowNameInFrames = true;
			}
			return newStorage;
		}
	};
	
	scope.check = function(storage, {settings, logging}){
		
		if (!storage.storageVersion){
			logging.message("No storage version found. Initializing storage.");
			browser.storage.local.remove(Object.keys(storage));
			storage = scope.transitions[""]({});
			browser.storage.local.set(storage);
		}
		else if (storage.storageVersion !== settings.storageVersion){
			const toChange = {};
			while (storage.storageVersion !== settings.storageVersion){
				logging.message("Old storage found (",
					storage.storageVersion, "expected", settings.storageVersion,
					")");
				if (scope.transitions[storage.storageVersion]){
					const changes = scope.transitions[storage.storageVersion](storage);
					Object.entries(changes).forEach(function(entry){
						const [name, value] = entry;
						toChange[name] = value;
						storage[name] = value;
					});
				}
				else {
					logging.error("Unable to migrate storage.");
					break;
				}
			}
			logging.notice("Changed settings:", toChange);
			browser.storage.local.set(toChange);
		}
	};
}());