/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	const {intercept} = require("./intercept.js");
	const {ask} = require("./askForPermission.js");
	const {check: originalCheck, checkStack: originalCheckStack} = require("./check.js");
	
	// Variable to "unload" the script
	var enabled = true;
	
	
	
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
	var port = browser.runtime.connect();
	var tabId;
	port.onMessage.addListener(function(data){
		if (data.hasOwnProperty("tabId")){
			console.log("my tab id is", data.tabId);
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
		if (interceptedWindows.get(window)){
			return false;
		}
		intercept(
			{subject: window},
			{check, checkStack, ask: askWrapper, notify, prefs}
		);
		
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
	
	if (enabled){
		interceptWindow(window);
	}

	browser.runtime.onMessage.addListener(function(data){
		if (data["canvasBlocker-unload"]){
			enabled = false;
		}
		if (data["canvasBlocker-sendNotifications"] === tabId){
			browser.runtime.sendMessage({
				sender: tabId,
				"canvasBlocker-notifications": notifications
			});
		}
	});
}());