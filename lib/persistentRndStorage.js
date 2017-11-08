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
		window.scope.persistentRndStorage = scope;
	}


	const settings = require("./settings");
	const logging = require("./logging");
	
	scope.persistentRnd = Object.create(null);
	scope.init = function init(){
		logging.message("initializing persistent rng storage");

		logging.notice("build persistent storage");

		if (settings.storePersistentRnd){
			try {
				let storedData = JSON.parse(settings.persistentRndStorage);
				for (var domain in storedData){
					var value = storedData[domain];
					if (
						Array.isArray(value) &&
						value.length === 128 &&
						value.every(function(value){
							return typeof value === "number" && value >= 0 && value < 256;
						})
					){
						scope.persistentRnd[domain] = value;
					}
				}
			}
			catch (e){
				// JSON is not valid -> ignore it
			}
		}
		else {
			settings.persistentRndStorage = "";
			settings.lastPersistentRndClearing = Date.now();
		}

		registerTimeout();

		logging.notice("register settings change event listener");
		settings.on(["persistentRndClearIntervalValue", "persistentRndClearIntervalUnit"], function(){
			window.clearTimeout(clearTimeout);
			registerTimeout();
		});
		settings.on("storePersistentRnd", function({newValue}){
			settings.persistentRndStorage = newValue? JSON.stringify(scope.persistentRnd): "";
		});
	};

	const getInterval = function(){
		var units = {
			seconds: 1000,
			minutes: 60 * 1000,
			hours: 60 * 60 * 1000,
			days: 24 * 60 * 60 * 1000,
			weeks: 7 * 24 * 60 * 60 * 1000,
			months: 30 * 24 * 60 * 60 * 1000,
			years: 365 * 24 * 60 * 60 * 1000,
		};
		return function getInterval(){
			return settings.persistentRndClearIntervalValue * units[settings.persistentRndClearIntervalUnit] || 0;
		};
	}();

	let clearTimeout;
	function registerTimeout(){
		var interval = getInterval();
		if (interval > 0){
			var timeout =  settings.lastPersistentRndClearing + interval - Date.now();
			logging.message("registering persistent rng data clearing timeout. Clearing in ", timeout, "ms");
			clearTimeout = window.setTimeout(clear, timeout);
		}
	}
	function broadcast(data){
		browser.tabs.query({}).then(function(tabs){
			tabs.forEach(function(tab){
				browser.tabs.sendMessage(tab.id, data);
			});
		});
	}
	function clear(){
		logging.verbose("domain rnd cleared");
		scope.persistentRnd = Object.create(null);
		settings.persistentRndStorage = JSON.stringify(scope.persistentRnd);
		settings.lastPersistentRndClearing = Date.now();
		registerTimeout();
		broadcast({"canvasBlocker-clear-domain-rnd": true});
	}
	function setDomainData(domain, rnd){
		logging.verbose("got new domain rnd for ", domain, ":", rnd);
		scope.persistentRnd[domain] = rnd;
		settings.persistentRndStorage = JSON.stringify(scope.persistentRnd);
		broadcast({"canvasBlocker-set-domain-rnd": {domain, rnd}});
	}

	scope.clear = clear;
	scope.setDomainData = setDomainData;
}());