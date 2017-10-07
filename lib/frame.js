/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const {intercept} = require("./intercept.js");
	const {ask} = require("./askForPermission.js");
	const lists = require("./lists.js");
	const {check: originalCheck, checkStack: originalCheckStack} = require("./check.js");
	const getWrapped = require("sdk/getWrapped");
	
	const logging = require("./logging");
	const {error, warning, message, notice, verbose, setPrefix: setLogPrefix} = logging;
	setLogPrefix("frame script");
	
	// Variable to "unload" the script
	var enabled = true;
	
	message("starting", location.href);
	
	function check(message){
		if (enabled){
			return originalCheck(message);
		}
		else {
			return {type: [], mode: "allow"};
		}
	}
	function checkStack(stack){
		if (enabled){
			return originalCheckStack(stack);
		}
		else {
			return true;
		}
	}
	function askWrapper(data){
		return ask(data, {
			_: browser.i18n.getMessage,
			prefs
		});
	}
	
	message("open port to background script");
	var port = browser.runtime.connect();
	var tabId;
	port.onMessage.addListener(function(data){
		if (data.hasOwnProperty("tabId")){
			notice("my tab id is", data.tabId);
			tabId = data.tabId;
		}
		if (data.hasOwnProperty("persistentRnd")){
			notice("got persistent random data", data.persistentRnd);
			const {persistent: persistentRnd} = require("./randomSupplies.js");
			Object.keys(data.persistentRnd).forEach(function(domain){
				verbose("random data for", domain, data.persistentRnd[domain]);
				persistentRnd.setDomainRnd(domain, data.persistentRnd[domain]);
			});
		}
		if (settings.isStillDefault && data.hasOwnProperty("settings")){
			notice("got settings from background script");
			Object.keys(data.settings).forEach(function(key){
				settings[key] = data.settings[key];
			});
			settings.isStillDefault = false;
			logging.clearQueue();
			lists.updateAll();
		}
	});
	var notifications = [];
	function notify(data){
		notifications.push(data);
		port.postMessage({"canvasBlocker-notify": data});
	}
	
	function prefs(name){
		return settings[name];
	}
	
	
	var interceptedWindows = new WeakMap();
	function interceptWindow(window){
		if (!enabled || interceptedWindows.get(window)){
			return false;
		}
		
		try {
			var href = window.location.href;
		}
		catch (e){
			// we are unable to read the location due to SOP
			// therefore we also can not intercept anything.
			warning("NOT intercepting window due to SOP", window);
			return false;
		}
		
		message("intercepting window", window);
		intercept(
			{subject: window},
			{check, checkStack, ask: askWrapper, notify, prefs}
		);
		message("prepare to intercept (i)frames.");

		[window.HTMLIFrameElement, window.HTMLFrameElement].forEach(function(constructor){
			var oldContentWindowGetter = constructor.prototype.__lookupGetter__("contentWindow");
			Object.defineProperty(
				getWrapped(constructor.prototype),
				"contentWindow",
				{
					enumerable: true,
					configureable: true,
					get: exportFunction(function(){
						var window = oldContentWindowGetter.call(this);
						interceptWindow(window);
						return window;
					}, window)
				}
			);
			var oldContentDocumentGetter = constructor.prototype.__lookupGetter__("contentDocument");
			Object.defineProperty(
				getWrapped(constructor.prototype),
				"contentDocument",
				{
					enumerable: true,
					configureable: true,
					get: exportFunction(function(){
						var document = oldContentDocumentGetter.call(this);
						interceptWindow(document.defaultView);
						return document;
					}, window)
				}
			);
		});
		
		interceptedWindows.set(window, true);
		return true;
	}
	
	if (settings.isStillDefault){
		message("load settings");
		browser.storage.local.get().then(function(data){
			Object.keys(data).forEach(function(key){
				notice("loaded setting:", key, ":", data[key]);
				settings[key] = data[key];
			});
			settings.isStillDefault = false;
			logging.clearQueue();
			lists.updateAll();
			interceptWindow(window);
		});
	}
	else {
		interceptWindow(window);
	}
	
	message("register listener for messages from background script");
	browser.runtime.onMessage.addListener(function(data){
		if (data["canvasBlocker-unload"]){
			enabled = false;
		}
		if (
			data.hasOwnProperty("canvasBlocker-sendNotifications") &&
			data["canvasBlocker-sendNotifications"] === tabId
		){
			notice("sending notifications:", notifications);
			browser.runtime.sendMessage({
				sender: tabId,
				"canvasBlocker-notifications": notifications
			});
			notice("notifications sent");
		}
	});
	
	
	message("register listener for settings changes");
	browser.storage.onChanged.addListener(function(change, area){
		if (area === "local"){
			Object.keys(change).forEach(function(key){
				notice("setting changed:", key, ":", change[key].newValue);
				settings[key] = change[key].newValue;
			});
		}
	});
}());