/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const settings = require("./settings");
	const logging = require("./logging");
	const {error, warning, message, notice, verbose, } = logging;
	logging.setPrefix("main script");
	const persistentRndStorage = require("./persistentRndStorage");
	const notification = require("./notification");
	
	message("start of background script");
	message("waiting for settings to be loaded");
	settings.onloaded(function(){
		notice("everything loaded");
		
		message("perform startup reset");
		settings.startupReset();
		
		persistentRndStorage.init();
		
		message("register non port message listener");
		browser.runtime.onMessage.addListener(function(data){
			notice("got data without port", data);
			var keys = Object.keys(data);
			if (data["canvasBlocker-new-domain-rnd"]){
				persistentRndStorage.setDomainData(
					data["canvasBlocker-new-domain-rnd"].domain,
					data["canvasBlocker-new-domain-rnd"].incognito,
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
			if (!port.sender.tab){
				notice("got port without tab = Firefox bug:", port);
				return;
			}
			verbose("send back the tab id", port.sender.tab.id);
			verbose("send back the persistent random seeds", persistentRndStorage.persistentRnd);
			port.postMessage({
				tabId: port.sender.tab.id,
				persistentRnd: persistentRndStorage.persistentRnd,
				persistentIncognitoRnd: persistentRndStorage.persistentIncognitoRnd
			});
			var url = new URL(port.sender.url);
			port.onMessage.addListener(function(data){
				if (data.hasOwnProperty("canvasBlocker-notify")){
					notification.show(port.sender.tab.id, url, data["canvasBlocker-notify"].api);
				}
				if (data.hasOwnProperty("canvasBlocker-clear-page-action")){
					notification.hide(port.sender.tab.id, url);
				}
				verbose("got data", data, "from port", port);
			});
		});
		
		message("register storage change event listener");
		
		if (browser.contentScripts){
			let unregister = function(){};
			let lastRegistering;
			const register = function register(){
				logging.message("Register content script for the settings.");
				logging.verbose("Unregister old content script, if present.");
				unregister();
				var data = {};
				settings.forEach(function(def){
					data[def.name] = def.get();
				});
				lastRegistering = data;
				browser.contentScripts.register({
					matches: ["<all_urls>"],
					matchAboutBlank: true,
					allFrames: true,
					runAt: "document_start",
					js: [{
						code: `(function(settingsData){
							if (typeof require !== "undefined"){
								const settings = require("./settings");
								const logging = require("./logging");
								if (settings.init(settingsData)){
									logging.message("Initialized settings by dynamic content script.");
								}
								else {
									logging.error("Dynamic content script was too late to provide settings.");
								}
							}
							else {
								if (!window.scope){
									window.scope = {};
								}
								window.scope.settingsData = settingsData;
								console.warn(
									"[CanvasBlocker] invalid content script order: require not defined at",
									window.location.href
								);
							}
						}(${JSON.stringify(data)}))`
					}]
				}).then(function(api){
					logging.verbose("Content script registered.");
					if (data !== lastRegistering){
						logging.verbose("Multiple content scripts registered at once. Remove unnecessary one.");
						api.unregister();
					}
					else {
						unregister = api.unregister;
					}
				});
			};
			register();
			settings.on("any", register);
		}
		else {
			logging.error("Old Firefox does not support browser.contentScript.register()");
		}
	});
	
	message("Initialize data-URL workaround.");
	require("./dataUrls").init();
	
	browser.runtime.onInstalled.addListener(function(details){
		function openOptions(reason){
			if (
				!browser.pageAction ||
				!browser.pageAction.show ||
				!browser.pageAction.openPopup
			){
				browser.tabs.create({
					url: browser.extension.getURL("options/options.html?notice=" + reason)
				});
			}
		}
		switch (details.reason){
			case "install":
				message("CanvasBlocker installed");
				openOptions(details.reason);
				break;
			case "update":
				settings.onloaded(function(){
					if (!settings.dontShowOptionsOnUpdate){
						message("CanvasBlocker updated");
						openOptions(details.reason);
					}
				});
		}
	});

	message("end");
}());
