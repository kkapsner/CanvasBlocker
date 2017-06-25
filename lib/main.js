/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	console.log("start main script");
	browser.runtime.onMessage.addListener(function(data){
		console.log("got data", data);
	});
	browser.runtime.onConnect.addListener(function(port){
		console.log("got port");
	});
	console.log("end main script");
	return null;
	require("./stylePreferencePane");
	
	
	const {when: unload} = require("sdk/system/unload");
	const {notify} = require("./notifications");
	
	const _ = require("sdk/l10n").get;
	const lists = require("./lists");
	const preferences = require("sdk/simple-prefs");
	const prefs = preferences.prefs;
	
	require("./webExtension");
	
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
	
	const {processes, frames, remoteRequire} = require("sdk/remote/parent");
	// remoteRequire("./frame.js", module); // currently not working due to a regression in the SDK
	var framePath = require("sdk/self").data.url("").replace(/data\/$/, "") + "lib/frame.js";
	remoteRequire(framePath);
	
	frames.port.on("canvasBlocker-notify", function(frame, data){
		notify(data, {lists, _, notificationPref, browser: frame.frameElement});
	});
	unload(function(){
		processes.port.emit("canvasBlocker-unload");
	});
	
	// persistent rng
	var persistentRnd = Object.create(null);
	try {
		let storedData = JSON.parse(prefs.persistentRndStorage);
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
	
	processes.port.on("canvasBlocker-new-domain-rnd", function(process, data){
		processes.port.emit("canvasBlocker-set-domain-rnd", data);
		persistentRnd[data.domain] = data.rnd;
		if (prefs.storePersistentRnd){
			prefs.persistentRndStorage = JSON.stringify(persistentRnd);
		}
	});
	processes.forEvery(function(process){
		if (process.isRemote){
			for (var domain in persistentRnd){
				process.port.emit("canvasBlocker-set-domain-rnd", {domain, rnd: persistentRnd[domain]});
			}
		}
	});
	preferences.on("storePersistentRnd", function(){
		if (prefs.storePersistentRnd){
			prefs.persistentRndStorage = JSON.stringify(persistentRnd);
		}
		else {
			prefs.persistentRndStorage = "";
		}
	});
	preferences.on("clearPersistentRnd", function(){
		persistentRnd = Object.create(null);
		prefs.persistentRndStorage = "";
		processes.port.emit("canvasBlocker-clear-domain-rnd");
	});
	
	// show release notes
	var data = require("sdk/self").data;
	preferences.on("showReleaseNotes", function(){
		var url = data.url("releaseNotes.txt").replace("/data/", "/");
		require("sdk/tabs").open(url);
	});
}());