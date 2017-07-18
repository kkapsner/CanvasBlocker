/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	function log(...args){
		args.unshift("main script:");
		args.unshift(new Date());
		console.log.apply(console, args);
	}
	
	log("start");
	log("loading storage");
	browser.storage.local.get().then(function(data){
		Object.keys(data).forEach(function(key){
			settings[key] = data[key];
		});
		return settings;
	}).then(function(settings){
		log("everything loaded");
		const lists = require("./lists");
		lists.updateAll();
		
		log("build persistent storage");
		var persistentRnd = Object.create(null);
		try {
			let storedData = JSON.parse(settings.persistentRndStorage);
			for (var domain in storedData){
				var value = storedData[domain];
				if (
					Array.isArray(value) &&
					value.length === 128 &&
					value.every(function(value){return typeof value === "number" && value >= 0 && value < 256;})
				){
					persistentRnd[domain] = value;
				}
			}
		}
		catch(e){}
		
		function updateContentScripts(){
			log("update content scripts");
			log("build settings blob");
			var settingsBlob = new Blob(
				[
					"var settings = " + JSON.stringify(settings) + ";",
					"var persistentRnd = " + JSON.stringify(persistentRnd) + ";"
				],
				{
					type: "text/javascript"
				}
			);
			log("TODO: register content scripts -> have to wait for the API to be released");
		}
		updateContentScripts();
		
		log("register non port message listener");
		browser.runtime.onMessage.addListener(function(data){
			log("got data without port", data);
			if (data["canvasBlocker-new-domain-rnd"]){
				log("got new domain rnd");
				data["canvasBlocker-set-domain-rnd"] = data["canvasBlocker-new-domain-rnd"];
				persistentRnd[data["canvasBlocker-new-domain-rnd"].domain] = data["canvasBlocker-new-domain-rnd"].rnd;
				browser.storage.local.get("storePersistentRnd").then(function(prefs){
					if (prefs.storePersistentRnd){
						browser.storage.local.set({persistentRndStorage: JSON.stringify(persistentRnd)});
					}
				});
				updateContentScripts();
			}
			log("pass the message to the tabs");
			browser.tabs.query({}).then(function(tabs){
				tabs.forEach(function(tab){
					browser.tabs.sendMessage(tab.id, data);
				});
			});
		});
		
		log("register port listener");
		browser.runtime.onConnect.addListener(function(port){
			log("got port", port);
			log("send back the tab id", port.sender.tab.id);
			port.postMessage({tabId: port.sender.tab.id});
			var url = new URL(port.sender.url);
			port.onMessage.addListener(function(data){
				browser.storage.local.get("showNotifications").then(function(data){
					if (
						(
							!data.hasOwnProperty("showNotifications") ||
							data.showNotifications
						) &&
						!lists.get("ignore").match(url)
					){
						browser.pageAction.show(port.sender.tab.id);
					}
				})
				log("got data", data, "from port", port);
			});
		});
		
		log("register storage change event listener");
		browser.storage.onChanged.addListener(function(change, area){
			if (area === "local"){
				log("settings changed", change);
				log("update settings object");
				Object.keys(change).forEach(function(key){
					settings[key] = change[key].newValue;
				});
				updateContentScripts();
				
				if (change.hasOwnProperty("showNotifications") && !change.showNotifications.newValue){
					log("notifications were disabled -> hide all page actions");
					browser.tabs.query({}).then(function(tabs){
						tabs.forEach(function(tab){
							browser.pageAction.hide(tab.id);
						});
					});
				}
				if (change.hasOwnProperty("storePersistentRnd")){
					browser.storage.local.set({
						persistentRndStorage: change.storePersistentRnd.newValue? JSON.stringify(persistentRnd): ""
					});
				}
			}
		});
		
		// hide page action when a tab is refreshed
		browser.tabs.onUpdated.addListener(function(tabId, data){
			if (data.status === "loading"){
				browser.pageAction.hide(tabId);
			}
		});
	});
	
	// log("TODO: register unload events - do not know how - there seems to be no way with a WebExtension");
	// old code
	// const {when: unload} = require("sdk/system/unload");
	// unload(function(){
		// processes.port.emit("canvasBlocker-unload");
	// });
	
	browser.runtime.onInstalled.addListener(function(){
		log("CanvasBlocker installed");
		browser.storage.local.get("storageVersion").then(function(data){
			if (data.storageVersion !== 0.1){
				browser.storage.local.set({
					storageVersion: 0.1
				});
			}
		});
	});

	log("end");
}());