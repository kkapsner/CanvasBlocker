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
		window.scope.settingsMigration = {};
		scope = window.scope.settingsMigration;
	}
	scope.validVersions = [undefined, 0.1, 0.2, 0.3, 0.4];
	scope.transitions = {
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
		},
		0.3: function(oldStorage){
			var newStorage = {
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
	};
	
	scope.check = function(storage, {settings, logging, changeValue, urlContainer}){
		
		if (!storage.storageVersion){
			logging.message("No storage version found. Initializing storage.");
			browser.storage.local.remove(Object.keys(storage));
			storage = scope.transitions[""]({});
			browser.storage.local.set(storage);
		}
		else if (storage.storageVersion !== settings.storageVersion){
			var toChange = {};
			while (storage.storageVersion !== settings.storageVersion){
				logging.message("Old storage found (",
					storage.storageVersion, "expected", settings.storageVersion,
					")");
				if (scope.transitions[storage.storageVersion]){
					var changes = scope.transitions[storage.storageVersion](storage);
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
	};
}());