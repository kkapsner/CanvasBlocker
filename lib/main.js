/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const settings = require("./settings");
	const logging = require("./logging");
	logging.setPrefix("main script");
	const persistentRndStorage = require("./persistentRndStorage");
	const notification = require("./notification");
	const mobile = require("./mobile");
	const extension = require("./extension");
	
	const registerSettingsContentScript = (function(){
		let unregisterSettingsContentScript = function(){};
		let lastRegistering;
		return async function registerSettingsContentScript(){
			logging.message("Register content script for the settings.");
			logging.verbose("Unregister old content script, if present.");
			unregisterSettingsContentScript();
			const data = {};
			settings.forEach(function(def){
				data[def.name] = def.get();
			});
			lastRegistering = data;
			const api = await browser.contentScripts.register({
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
								logging.warning("Dynamic content script was too late to provide settings.");
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
			});
			
			logging.verbose("Content script registered.");
			if (data !== lastRegistering){
				logging.verbose("Multiple content scripts registered at once. Remove unnecessary one.");
				api.unregister();
			}
			else {
				unregisterSettingsContentScript = api.unregister;
			}
		};
	}());
	
	logging.message("start of background script");
	logging.message("waiting for settings to be loaded");
	settings.onloaded(function(){
		logging.notice("everything loaded");
		
		logging.message("perform startup reset");
		settings.startupReset();
		
		persistentRndStorage.init();
		
		logging.message("register non port message listener");
		browser.runtime.onMessage.addListener(async function(data){
			logging.notice("got data without port", data);
			const keys = Object.keys(data);
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
				persistentRndStorage.clear(data["canvasBlocker-clear-domain-rnd"] === "force");
				if (keys.length === 1){
					return;
				}
			}
			if (data["canvasBlocker-clear-container-rnd"]){
				persistentRndStorage.clearContainerData(data["canvasBlocker-clear-container-rnd"]);
				if (keys.length === 1){
					return;
				}
			}
			logging.notice("pass the message to the tabs");
			const tabs = await browser.tabs.query({});
			tabs.forEach(function(tab){
				browser.tabs.sendMessage(tab.id, data);
			});
		});
		
		logging.message("register port listener");
		browser.runtime.onConnect.addListener(function(port){
			logging.notice("got port", port);
			if (!port.sender.tab){
				logging.notice("got port without tab = Firefox bug:", port);
				return;
			}
			logging.verbose("send back the tab id", port.sender.tab.id);
			logging.verbose("send back the tab cookie store id", port.sender.tab.cookieStoreId);
			logging.verbose("send back the persistent random seeds", persistentRndStorage.persistentRnd);
			port.postMessage({
				tabId: port.sender.tab.id,
				cookieStoreId: port.sender.tab.cookieStoreId || "",
				persistentRnd: persistentRndStorage.persistentRnd,
				persistentIncognitoRnd: persistentRndStorage.persistentIncognitoRnd
			});
			const url = new URL(port.sender.url);
			port.onMessage.addListener(function(data){
				if (data.hasOwnProperty("canvasBlocker-notify")){
					notification.show(port.sender.tab.id, url, data["canvasBlocker-notify"].api);
				}
				if (data.hasOwnProperty("canvasBlocker-clear-page-action")){
					notification.hide(port.sender.tab.id, url);
				}
				logging.verbose("got data", data, "from port", port);
			});
		});
		
		logging.message("register storage change event listener");
		
		if (browser.contentScripts){
			registerSettingsContentScript();
			settings.on("any", registerSettingsContentScript);
		}
		else {
			logging.error("Old Firefox does not support browser.contentScript.register()");
		}
	});
	
	logging.message("Initialize data-URL workaround.");
	require("./dataUrls").init();
	
	logging.message("Initialize navigator HTTP header protection.");
	require("./navigator").init();
	
	browser.runtime.onInstalled.addListener(function(details){
		function openOptions(reason){
			if (
				!browser.pageAction ||
				!browser.pageAction.show ||
				!browser.pageAction.openPopup
			){
				browser.tabs.create({
					url: extension.getURL("options/options.html?notice=" + reason)
				});
			}
		}
		switch (details.reason){
			case "install":
				logging.message("CanvasBlocker installed");
				openOptions(details.reason);
				settings.onloaded(function(){
					if (settings.showPresetsOnInstallation){
						browser.tabs.create({
							url: extension.getURL("options/presets.html?notice=" + details.reason)
						});
					}
				});
				break;
			case "update":
				settings.onloaded(function(){
					if (!settings.dontShowOptionsOnUpdate){
						logging.message("CanvasBlocker updated");
						openOptions(details.reason);
					}
				});
		}
		
		// mobile default settings
		mobile.ifMobile(async function(){
			const settings = await browser.storage.local.get();
			mobile.applyMobileDefaults(settings);
		});
	});
	
	if (browser.runtime.onSuspend){
		browser.runtime.onSuspend.addListener(async function(){
			logging.message("Suspending CanvasBlocker");
			(await browser.tabs.query({})).forEach(function(tab){
				browser.tabs.sendMessage(tab.id, {
					"canvasBlocker-unload": true
				});
			});
		});
	}
	if (browser.runtime.onUpdateAvailable){
		browser.runtime.onUpdateAvailable.addListener(async function(details){
			logging.message("Update available", details);
			if (settings.disruptSessionOnUpdate){
				await Promise.all((await browser.tabs.query({})).map(async function(tab){
					try{
						await browser.tabs.sendMessage(tab.id, {
							"canvasBlocker-unload": true
						});
					}
					catch(error){
						logging.verbose("error while unloading", tab, ":", error);
					}
				}));
				window.setTimeout(function(){
					logging.verbose("Reload extension after one second");
					browser.runtime.reload();
				}, 1000);
			}
			else {
				settings.updatePending = true;
			}
		});
	}
	logging.message("end");
}());
