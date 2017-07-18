/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	function log(...args){
		function leftPad(str, char, pad){
			str = "" + str;
			return char.repeat(pad - str.length) + str;
		}
		args.unshift("frame script:");
		var now = new Date();
		args.unshift(
			now.getFullYear() + "-" +
			leftPad(now.getMonth() + 1, "0", 2) + "-" +
			leftPad(now.getDate(), "0", 2) + " " +
			leftPad(now.getHours(), "0", 2) + ":" +
			leftPad(now.getMinutes(), "0", 2) + ":" +
			leftPad(now.getSeconds(), "0", 2) + "." + 
			leftPad(now.getMilliseconds(), "0", 3) 
		);
		console.log.apply(console, args);
	}
	
	const {intercept} = require("./intercept.js");
	const {ask} = require("./askForPermission.js");
	const {check: originalCheck, checkStack: originalCheckStack} = require("./check.js");
	
	// Variable to "unload" the script
	var enabled = true;
	
	log("starting", location.href);
	
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
	const _ = require("sdk/l10n").get;
	function askWrapper(data){
		return ask(data, {
			_,
			prefs
		});
	}
	
	log("open port to background script");
	var port = browser.runtime.connect();
	var tabId;
	port.onMessage.addListener(function(data){
		if (data.hasOwnProperty("tabId")){
			log("my tab id is", data.tabId);
			tabId = data.tabId;
		}
	});
	var notifications = [];
	function notify(data){
		notifications.push(data);
		port.postMessage({"canvasBlocker-notify": data});
	}
	
	const preferences = require("sdk/simple-prefs");
	function prefs(name){
		return preferences.prefs[name];
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
			log("NOT intercepting window du to SOP", window);
			return false;
		}
		
		log("intercepting window", window);
		intercept(
			{subject: window},
			{check, checkStack, ask: askWrapper, notify, prefs}
		);
		log("prepare to intercept (i)frames.");
		
		[window.HTMLIFrameElement, window.HTMLFrameElement].forEach(function(constructor){
			var oldContentWindowGetter = constructor.prototype.__lookupGetter__("contentWindow");
			Object.defineProperty(
				constructor.prototype.wrappedJSObject,
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
				constructor.prototype.wrappedJSObject,
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
	};
	
	interceptWindow(window);
	
	log("register listener for messages from background script");
	browser.runtime.onMessage.addListener(function(data){
		if (data["canvasBlocker-unload"]){
			enabled = false;
		}
		if (data.hasOwnProperty("canvasBlocker-sendNotifications") && data["canvasBlocker-sendNotifications"] === tabId){
			log("sending notifications:", notifications);
			browser.runtime.sendMessage({
				sender: tabId,
				"canvasBlocker-notifications": notifications
			});
			log("notifications sent");
		}
	});
	
	log("load settings");
	browser.storage.local.get().then(function(data){
		Object.keys(data).forEach(function(key){
			log("loaded setting:", key, ":", data[key]);
			settings[key] = data[key];
		});
	});
	
	log("register listener for settings changes");
	browser.storage.onChanged.addListener(function(change, area){
		if (area === "local"){
			Object.keys(change).forEach(function(key){
				log("setting changed:", key, ":", change[key].newValue);
				settings[key] = change[key].newValue;
			});
		}
	});
}());