/* global console */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var self = require("sdk/self");
	var pageMod = require("sdk/page-mod");
	var array = require("sdk/util/array");
	var preferences = require("sdk/simple-prefs");
	var prefService = require("sdk/preferences/service");
	var prefs = preferences.prefs;
	var URL = require("sdk/url").URL;
	var _ = require("sdk/l10n").get;
	var tabUtils = require("sdk/tabs/utils");

	var sharedFunctions = require("./sharedFunctions.js");
	var getDomainRegExpList = sharedFunctions.getDomainRegExpList;
	// preferences
	Object.keys(prefs).forEach(function(pref){
		preferences.on(pref, function(){
			workers.forEach(checkWorker);
		});
	});
	var whiteList;
	function updateWhiteList(){
		whiteList = getDomainRegExpList(prefs.whiteList);
	}
	updateWhiteList();
	preferences.on("whiteList", function(){
		updateWhiteList();
	});

	var blackList;
	function updateBlackList(){
		blackList = getDomainRegExpList(prefs.blackList);
	}
	updateBlackList();
	preferences.on("blackList", function(){
		updateBlackList();
	});

	var ignoreList;
	function updateIgnoreList(){
		ignoreList = getDomainRegExpList(prefs.ignoreList);
	}
	updateIgnoreList();
	preferences.on("ignoreList", function(){
		updateIgnoreList();
	});
	
	// preferences for injected file
	var preferencesForInjected = ["showCallingFile", "showCompleteCallingStack"];
	preferencesForInjected.forEach(function(name){
		preferences.on(name, function(){
			workers.forEach(function(worker){
				worker.port.emit("set", name, prefs[name]);
			});
		});
	});
	
	function checkURL(url){
		return sharedFunctions.checkURL(url, prefs.blockMode, whiteList, blackList);
	}
	function checkWorker(worker){
		try {
			var mode;
			var url = new URL(worker.url);
			if (
				(url.protocol === "about:") ||
				(prefs.allowPDFCanvas && worker.tab.contentType.match(/\/pdf$/i))
			){
				mode = "unblock";
			}
			else {
				mode = checkURL(url);
			}
			worker.port.emit(mode, prefs.askOnlyOnce);
		}
		catch (e){
			console.log("Error updating " + worker.url + ": " + e.message);
		}
	}

	var workers = [];
	var workerTranslations = {
		sourceOutput: _("sourceOutput"),
		stackEntryOutput: _("stackEntryOutput")
	};
	
	["", "Readout"].forEach(function(type){
		["", "Visible", "Invisible"].forEach(function(visibility){
				var text = "askFor" + visibility + type + "Permission";
				workerTranslations[text] = _(text);
		});
	});
			
	var workerOptions = {
		blockMode: checkURL(),
		whiteList: prefs.whiteList,
		blackList: prefs.blackList,
		askOnce: prefs.askOnce,
		translations: workerTranslations
	};
	preferences.on("blockMode", function(){
		workerOptions.blockMode = checkURL();
	});
	["whiteList", "blackList", "askOnce"].forEach(function(prefName){
		preferences.on(prefName, function(){
			workerOptions[prefName] = prefs[prefName];
		});
	});
	pageMod.PageMod({
		include: "*",
		contentScriptWhen: "start",
		contentScriptFile: [
			self.data.url("sharedFunctions.js").replace("/data/", "/lib/"),
			self.data.url("inject.js"),
		],
		contentScriptOptions: workerOptions,
		onAttach: function(worker){
			
			array.add(workers, worker);
			worker.on("pageshow", function(){
				array.add(workers, this);
			});
			worker.on("pagehide", function(){
				array.remove(workers, this);
			});
			worker.on("detach", function(){
				array.remove(workers, this);
			});
			
			preferencesForInjected.forEach(function(name){
				worker.port.emit("set", name, prefs[name]);
			});
			
			checkWorker(worker);
			
			// display notifications
			worker.port.on("accessed readAPI", function(status, callingStackMsg){
				switch (status){
					case "fake":
						
						var contentURL = new URL(worker.contentURL);
						if (prefs.showNotifications && !ignoreList.match(contentURL)){
							var url = contentURL.href;
							var domain = contentURL.hostname;
							var message = _("fakedReadout").replace(/\{url\}/g, url);
							
							var tab = tabUtils.getTabForId(worker.tab.id);
							var tabBrowser = tabUtils.getTabBrowserForTab(tab);
							var browser = tabUtils.getBrowserForTab(tab);
							
							var notifyBox = tabBrowser.getNotificationBox(browser);
							var notification = notifyBox.getNotificationWithValue("fake-readout");
							if (notification){
								notification.label = message;
							}
							else {
								var buttons = [
									{
										label: _("displayCallingStack"),
										accessKey: "",
										callback: function(){
											browser.contentWindow.alert(callingStackMsg);
											// only way to prevent closing... see https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Method/appendNotification#Notification_box_events
											throw new Error("Do not close notification.");
										}
									},
									{
										label: _("ignorelistDomain"),
										accessKey: "",
										callback: function(){
											prefs.ignoreList += "," + domain;
											prefService.set("extensions.CanvasBlocker@kkapsner.de.ignoreList", prefs.ignoreList);
											updateIgnoreList();
										}
									},
									{
										label: _("whitelistURL"),
										accessKey: "",
										callback: function(){
											prefs.whiteList += "," + url;
											prefService.set("extensions.CanvasBlocker@kkapsner.de.whiteList", prefs.whiteList);
											updateWhiteList();
											workers.forEach(checkWorker);
										}
									},
									{
										label: _("whitelistDomain"),
										accessKey: "",
										callback: function(){
											prefs.whiteList += "," + domain;
											prefService.set("extensions.CanvasBlocker@kkapsner.de.whiteList", prefs.whiteList);
											updateWhiteList();
											workers.forEach(checkWorker);
										}
									},
									{
										label: _("disableNotifications"),
										accessKey: "",
										callback: function(){
											prefs.showNotifications = false;
											prefService.set("extensions.CanvasBlocker@kkapsner.de.showNotifications", prefs.showNotifications);
										}
									}
								];

								var priority = notifyBox.PRIORITY_WARNING_MEDIUM;
								notification = notifyBox.appendNotification(
									message,
									"fake-readout",
									"chrome://browser/skin/Info.png",
									priority,
									buttons
								);
							}
						}
						break;
				}
			});
		},
	});

}());