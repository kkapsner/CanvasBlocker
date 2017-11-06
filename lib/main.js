/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const settings = require("./settings");
	const logging = require("./logging");
	const {error, warning, message, notice, verbose, } = logging;
	const lists = require("./lists");
	logging.setPrefix("main script");
	
	message("start of background script");
	message("waiting for settings to be loaded");
	settings.onloaded(function(){
		notice("everything loaded");
		
		notice("build persistent storage");
		var persistentRnd = Object.create(null);
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
					persistentRnd[domain] = value;
				}
			}
		}
		catch(e){
			// JSON is not valid -> ignore it
		}
		
		function updateContentScripts(){
			message("update content scripts");
			notice("build settings blob");
			var settingsBlob = new Blob(
				[
					"var settings = " + JSON.stringify(settings) + ";",
					"var persistentRnd = " + JSON.stringify(persistentRnd) + ";"
				],
				{
					type: "text/javascript"
				}
			);
			warning("TODO: register content scripts -> have to wait for the API to be released");
		}
		updateContentScripts();
		
		message("register non port message listener");
		browser.runtime.onMessage.addListener(function(data){
			notice("got data without port", data);
			if (data["canvasBlocker-new-domain-rnd"]){
				verbose("got new domain rnd", data["canvasBlocker-new-domain-rnd"]);
				data["canvasBlocker-set-domain-rnd"] = data["canvasBlocker-new-domain-rnd"];
				persistentRnd[data["canvasBlocker-new-domain-rnd"].domain] = data["canvasBlocker-new-domain-rnd"].rnd;
				if (settings.storePersistentRnd){
					settings.persistentRndStorage = JSON.stringify(persistentRnd);
				}
				updateContentScripts();
			}
			if (data["canvasBlocker-clear-domain-rnd"]){
				verbose("domain rnd cleared");
				persistentRnd = Object.create(null);
				if (settings.storePersistentRnd){
					settings.persistentRndStorage = JSON.stringify(persistentRnd);
				}
				updateContentScripts();
			}
			notice("pass the message to the tabs");
			browser.tabs.query({}).then(function(tabs){
				tabs.forEach(function(tab){
					browser.tabs.sendMessage(tab.id, data);
				});
			});
		});
		
		message("register port listener");
		browser.runtime.onConnect.addListener(function(port){
			notice("got port", port);
			verbose("send back the tab id", port.sender.tab.id);
			verbose("send back the persistent random seeds", persistentRnd);
			port.postMessage({
				tabId: port.sender.tab.id,
				persistentRnd: persistentRnd
			});
			var url = new URL(port.sender.url);
			port.onMessage.addListener(function(data){
				if (data.hasOwnProperty("canvasBlocker-notify")){
					if (
						settings.showNotifications &&
						!lists.get("ignore").match(url)
					){
						browser.pageAction.show(port.sender.tab.id);
					}
				}
				verbose("got data", data, "from port", port);
			});
		});
		
		message("register storage change event listener");
		
		settings.on("any", updateContentScripts);
		settings.on("showNotifications", function({newValue}){
			if (!newValue){
				message("notifications were disabled -> hide all page actions");
				browser.tabs.query({}).then(function(tabs){
					tabs.forEach(function(tab){
						browser.pageAction.hide(tab.id);
					});
				});
			}
		});
		settings.on("storePersistentRnd", function({newValue}){
			settings.persistentRndStorage = newValue? JSON.stringify(persistentRnd): "";
		});
		
		// hide page action when a tab is refreshed
		browser.tabs.onUpdated.addListener(function(tabId, data){
			if (data.status === "loading"){
				browser.pageAction.hide(tabId);
			}
		});
	});
	
	browser.runtime.onInstalled.addListener(function(){
		message("CanvasBlocker installed");
		browser.storage.local.get("storageVersion").then(function(data){
			if (data.storageVersion !== 0.1){
				browser.storage.local.set({
					storageVersion: 0.1
				});
			}
		});
	});

	message("end");
}());
