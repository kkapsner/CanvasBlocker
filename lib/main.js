/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	// require("./stylePreferencePane");
	
	
	const {when: unload} = require("sdk/system/unload");
	const {notify} = require("./notifications");
	
	const _ = require("sdk/l10n").get;
	const lists = require("./lists");
	const preferences = require("sdk/simple-prefs");
	const prefs = preferences.prefs;
	
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
	remoteRequire("./frame.js", module);
	
	frames.port.on("canvasBlocker-notify", function(frame, data){
		notify(data, {lists, _, notificationPref, browser: frame.frameElement});
	});
	unload(function(){
		processes.port.emit("canvasBlocker-unload");
	});
	
	// persistent rng
	const persistentRnd = Object.create(null);
	processes.port.on("canvasBlocker-new-domain-rnd", function(process, data){
		processes.port.emit("canvasBlocker-set-domain-rnd", data);
		persistentRnd[data.domain] = data.rnd;
	});
	processes.on("attach", function(process){
		if (process.isRemote){
			for (var name in persistentRnd){
				process.port.emit("canvasBlocker-set-domain-rnd", {domain: name, rnd: persistentRnd[name]});
			}
		}
	});
	
	// show release notes
	var data = require("sdk/self").data;
	preferences.on("showReleaseNotes", function(){
		var url = data.url("releaseNotes.txt").replace("/data/", "/");
		require("sdk/tabs").open(url);
	});
}());