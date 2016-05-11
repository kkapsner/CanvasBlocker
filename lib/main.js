/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	require("./stylePreferencePane");
	
	
	const {when: unload} = require("sdk/system/unload");
	const {check} = require("./check.js");
	const {notify} = require("./notifications");
	
	const _ = require("sdk/l10n").get;
	const lists = require("./lists");
	const preferences = require("sdk/simple-prefs");
	const prefService = require("sdk/preferences/service");
	const prefs = preferences.prefs;
	
	const notificationPref =  {
		doShow: function(){
			return prefs.showNotifications;
		},
		setShow: function(value){
			prefs.showNotifications = value;
			prefService.set("extensions.CanvasBlocker@kkapsner.de.showNotifications", prefs.showNotifications);
		}
	};
	
	const {Cc, Ci} = require("chrome");

	var ss = require("sdk/simple-storage");
	var data;

	// Create or load the profile seed.
	var storageData = ss.storage.data;
	if (storageData == undefined)
	{
    	data = {};
    	data.profile_seed = createProfileSeed();
		ss.storage.data = JSON.stringify(data);
    	console.log("Created profile seed: " + data.profile_seed);
	} else {
		data = JSON.parse(storageData);
		console.log("Loaded profile seed: " + data.profile_seed);
	}

	/*
	 * Utility function to use local entropy source to generate a new profile seed.
	 */
	function createProfileSeed() {
		var text = "P_";
		var charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
		for (var i = 0; i < 10; i++)
			text += charset.charAt(Math.floor(Math.random() * charset.length));
		return text;
	}

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

	addMessageListener("canvasBlocker-getProfileSeed", function(ev){
		// Signal that persistent profile mode is disabled by returning an empty string.
		if (prefs.usePersistentProfile) {
			return data.profile_seed;
		} else {
			return "";
		}
	});

	addMessageListener("canvasBlocker-check", function(ev){
		var status = check(ev.data);
		return status;
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
	
}());