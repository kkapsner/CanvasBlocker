/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	require("./stylePreferencePane");
	
	
	const {when: unload} = require("sdk/system/unload");
	const {check, checkStack} = require("./check.js");
	const {notify} = require("./notifications");
	
	const _ = require("sdk/l10n").get;
	const lists = require("./lists");
	const preferences = require("sdk/simple-prefs");
	const prefService = require("sdk/preferences/service");
	const prefs = preferences.prefs;
	const webExtension = require("sdk/webextension");
	webExtension.startup().then(function(api){
		  const {browser} = api;
		  // browser.runtime.onMessage.addListener(handleMessage);
		}
	);
	
	const notificationPref =  {
		doShow: function(){
			return prefs.showNotifications;
		},
		setShow: function(value){
			prefs.showNotifications = value;
			prefService.set("extensions.CanvasBlocker@kkapsner.de.showNotifications", prefs.showNotifications);
		},
		displayTime: function(){
			return prefs.notificationDisplayTime;
		}
	};
	
	const {Cc, Ci} = require("chrome");
	var globalMM = Cc["@mozilla.org/globalmessagemanager;1"].getService(Ci.nsIMessageListenerManager);
	var frameURL = require("sdk/self").data.url("frame.js?" + Math.random());
	globalMM.loadFrameScript(frameURL, true);
	
	var listeners = [];
	function addMessageListener(name, func){
		listeners.push({name, func});
		globalMM.addMessageListener(name, func);
	}
	unload(function(){
		globalMM.removeDelayedFrameScript(frameURL);
		globalMM.broadcastAsyncMessage("canvasBlocker-unload");
		listeners.forEach(function(listener){
			globalMM.removeMessageListener(listener.name, listener.func);
		});
	});
	
	// messages from the frame.js
	addMessageListener("canvasBlocker-check", function(ev){
		var status = check(ev.data);
		return status;
	});
	addMessageListener("canvasBlocker-checkStack", function(ev){
		return checkStack(ev.data);
	});
	
	addMessageListener("canvasBlocker-notify", function(ev){
		var browser = ev.target;
		notify(ev.data, {lists, _, notificationPref, browser});
	});
	
	addMessageListener("canvasBlocker-pref-get", function(ev){
		return prefs[ev.data];
	});
	addMessageListener("canvasBlocker-pref-set", function(ev){
		prefs[ev.data.name] = ev.data.value;
		prefService.set("extensions.CanvasBlocker@kkapsner.de." + ev.data.name, ev.data.value);
	});
	
	addMessageListener("canvasBlocker-list-match", function(ev){
		return lists.get(ev.data.list).match(ev.data.url);
	});
	addMessageListener("canvasBlocker-list-appendTo", function(ev){
		return lists.appendTo(ev.data.list, ev.data.entry);
	});
	
	addMessageListener("canvasBlocker-translate", function(ev){
		return _(ev.data);
	});
	
	var data = require("sdk/self").data;
	preferences.on("showReleaseNotes", function(){
		var url = data.url("releaseNotes.txt").replace("/data/", "/");
		require("sdk/tabs").open(url);
	});
}());