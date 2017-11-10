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
	const persistentRndStorage = require("./persistentRndStorage");
	
	message("start of background script");
	message("waiting for settings to be loaded");
	settings.onloaded(function(){
		notice("everything loaded");
		
		persistentRndStorage.init();
		
		message("register non port message listener");
		browser.runtime.onMessage.addListener(function(data){
			notice("got data without port", data);
			var keys = Object.keys(data);
			if (data["canvasBlocker-new-domain-rnd"]){
				persistentRndStorage.setDomainData(
					data["canvasBlocker-new-domain-rnd"].domain,
					data["canvasBlocker-new-domain-rnd"].rnd
				);
				if (keys.length === 1){
					return;
				}
			}
			if (data["canvasBlocker-clear-domain-rnd"]){
				persistentRndStorage.clear();
				if (keys.length === 1){
					return;
				}
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
			verbose("send back the persistent random seeds", persistentRndStorage.persistentRnd);
			port.postMessage({
				tabId: port.sender.tab.id,
				persistentRnd: persistentRndStorage.persistentRnd
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
		
		// hide page action when a tab is refreshed
		browser.tabs.onUpdated.addListener(function(tabId, data){
			if (data.status && data.status === "loading"){
				browser.pageAction.hide(tabId);
			}
		});
	});
	
	browser.runtime.onInstalled.addListener(function(){
		message("CanvasBlocker installed");
	});

	message("end");
}());
