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
		scope = require.register("./persistentRndStorage", {});
	}
	
	
	const settings = require("./settings");
	const logging = require("./logging");
	
	scope.persistentRnd = Object.create(null);
	scope.persistentIncognitoRnd = Object.create(null);
	let clearTimeout;
	scope.init = function init(){
		logging.message("initializing persistent rng storage");

		logging.notice("build persistent storage");

		if (settings.storePersistentRnd){
			try {
				let storedData = JSON.parse(settings.persistentRndStorage);
				for (let domain in storedData){
					const value = storedData[domain];
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
			catch (error){
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
		
		if (browser.contextualIdentities && browser.contextualIdentities.onRemoved){
			logging.message("register contextual identities removal");
			browser.contextualIdentities.onRemoved.addListener(function(details){
				logging.message("Contextual identity", details.contextualIdentity.cookieStoreId, "removed.");
				clearContainerData(details.contextualIdentity.cookieStoreId);
			});
		}
		else {
			logging.error(
				"Old Firefox does not support browser.contextualIdentities.onRemoved"
			);
		}
	};

	const getInterval = function(){
		const units = {
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
	
	function registerTimeout(){
		const interval = getInterval();
		if (interval > 0){
			const timeout = settings.lastPersistentRndClearing + interval - Date.now();
			logging.message("registering persistent rng data clearing timeout. Clearing in ", timeout, "ms");
			if (timeout > 1073741824){
				// window.setTimeout can only handle delays up to 32 bit.
				// Therefore we repeat the registering after 2^30 = 1073741824 seconds
				clearTimeout = window.setTimeout(registerTimeout, 1073741824);
			}
			else {
				clearTimeout = window.setTimeout(clear, timeout);
			}
		}
	}
	async function broadcast(data){
		const tabs = await browser.tabs.query({});
		tabs.forEach(function(tab){
			browser.tabs.sendMessage(tab.id, data);
		});
	}
	function clearIncognito(){
		scope.persistentIncognitoRnd = Object.create(null);
		settings.persistentIncognitoRndStorage = JSON.stringify(scope.persistentIncognitoRnd);
	}
	function clear(force = false){
		logging.verbose("domain rnd cleared");
		scope.persistentRnd = Object.create(null);
		settings.persistentRndStorage = JSON.stringify(scope.persistentRnd);
		settings.lastPersistentRndClearing = Date.now();
		clearIncognito();
		registerTimeout();
		broadcast({"canvasBlocker-clear-domain-rnd": force? "force": true});
	}
	function setDomainData(domain, incognito, rnd){
		logging.verbose("got new domain rnd for ", domain, " (incognito:", incognito, "):", rnd);
		if (incognito){
			scope.persistentIncognitoRnd[domain] = rnd;
			settings.persistentIncognitoRndStorage = JSON.stringify(scope.persistentIncognitoRnd);
		}
		else {
			scope.persistentRnd[domain] = rnd;
			settings.persistentRndStorage = JSON.stringify(scope.persistentRnd);
		}
		broadcast({"canvasBlocker-set-domain-rnd": {domain, incognito, rnd}});
	}
	function clearDomainData(domain){
		logging.verbose("clear domain rnd for ", domain);
		delete scope.persistentIncognitoRnd[domain];
		settings.persistentIncognitoRndStorage = JSON.stringify(scope.persistentIncognitoRnd);
		delete scope.persistentRnd[domain];
		settings.persistentRndStorage = JSON.stringify(scope.persistentRnd);
	}
	
	function clearContainerData(cookieStoreId){
		logging.verbose("clear container rnd for ", cookieStoreId);
		Object.keys(scope.persistentRnd).forEach(function(domain){
			if (domain.startsWith(cookieStoreId + "@")){
				delete scope.persistentRnd[domain];
			}
		});
		settings.persistentRndStorage = JSON.stringify(scope.persistentRnd);
		
		Object.keys(scope.persistentIncognitoRnd).forEach(function(domain){
			if (domain.startsWith(cookieStoreId + "@")){
				delete scope.persistentIncognitoRnd[domain];
			}
		});
		settings.persistentIncognitoRndStorage = JSON.stringify(scope.persistentIncognitoRnd);
	}
	
	scope.clear = clear;
	scope.setDomainData = setDomainData;
	scope.clearDomainData = clearDomainData;
	scope.clearContainerData = clearContainerData;
	
	try {
		browser.windows.onRemoved.addListener(async function(){
			const windows = await browser.windows.getAll();
			if (windows.every(function(window){
				return !window.incognito;
			})){
				clearIncognito();
			}
		});
	}
	catch (error){
		logging.error("Unable to register windows.onRemoved listener", error);
	}
}());