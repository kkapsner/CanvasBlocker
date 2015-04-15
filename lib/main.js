/* global console */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	function getDomainRegExpList(domainList){
		var list = domainList
			.split(",")
			.map(function(entry){
				return entry.replace(/^\s+|\s+$/g, "");
			})
			.filter(function(entry){
				return !!entry.length;
			})
			.map(function(entry){
				var regExp;
				var domain = !!entry.match(/^[\w.]+$/);
				if (domain){
					regExp = new RegExp("(?:^|\\.)" + entry.replace(/([\\\+\*\?\[\^\]\$\(\)\{\}\=\!\|\.])/g, "\\$1") + "\\.?$", "i");
				}
				else {
					regExp = new RegExp(entry, "i");
				}
				return {
					match: function(url){
						if (domain){
							return url.hostname.match(regExp);
						}
						else {
							return url.href.match(regExp);
						}
					}
				};
			});
			
			list.match = function(url){
				return this.some(function(entry){
					return entry.match(url);
				});
			};
			
			return list;
	}

	var self = require("sdk/self");
	var pageMod = require("sdk/page-mod");
	var array = require("sdk/util/array");
	var preferences = require("sdk/simple-prefs");
	var prefService = require("sdk/preferences/service");
	var prefs = preferences.prefs;
	var URL = require("sdk/url").URL;
	var _ = require("sdk/l10n").get;
	var tabUtils = require("sdk/tabs/utils");
	var windowUtils = require("sdk/window/utils");

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
		var mode = "block";
		switch (prefs.blockMode){
			case "blockEverything":
				mode = "block";
				break;
			case "allowOnlyWhiteList":
				if (whiteList.match(url)){
					mode = "unblock";
				}
				else {
					mode = "block";
				}
				break;
			case "ask":
			case "blockReadout":
			case "fakeReadout":
			case "askReadout":
				if (whiteList.match(url)){
					mode = "unblock";
				}
				else if (blackList.match(url)){
					mode = "block";
				}
				else {
					mode = prefs.blockMode;
				}
				break;
			case "blockOnlyBlackList":
				if (blackList.match(url)){
					mode = "block";
				}
				else {
					mode = "unblock";
				}
				break;
			case "allowEverything":
				mode = "unblock";
				break;
			default:
				console.log("Unknown blocking mode. Default to block everything.");
		}
		return mode;
	}
	function checkWorker(worker){
		try {
			var mode;
			var url = new URL(worker.url)
			if (
				(url.protocol === "about:") ||
				(prefs.allowPDFCanvas && worker.tab.contentType.match(/\/pdf$/i))
			){
				mode = "unblock";
			}
			else {
				var mode = checkURL(url);
			}
			worker.port.emit(mode, prefs.askOnlyOnce);
		}
		catch (e){
			console.log("Error updating " + worker.url + ": " + e.message);
		}
	}

	var workers = [];
	pageMod.PageMod({
		include: "*",
		contentScriptWhen: "start",
		contentScriptFile: self.data.url("inject.js"),
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
			["", "Readout"].forEach(function(type){
				["", "Visible", "Invisible"].forEach(function(visibility){
						var text = "askFor" + visibility + type + "Permission";
						worker.port.emit("setTranslation", text, _(text));
				});
			});
			worker.port.emit("setTranslation", "sourceOutput", _("sourceOutput"));
			worker.port.emit("setTranslation", "stackEntryOutput", _("stackEntryOutput"));
			
			preferencesForInjected.forEach(function(name){
				worker.port.emit("set", name, prefs[name]);
			});
			
			checkWorker(worker);
			
			// display notifications
			worker.port.on("accessed readAPI", function(status, callingStackMsg){
				function log(title, object){
					console.log(title);
					for (var name in object){
						console.log(name, object[name]);
					}
				}
				switch (status){
					case "fake":
						
						var contentURL = new URL(worker.contentURL);
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
								}
							];

							let priority = notifyBox.PRIORITY_WARNING_MEDIUM;
							notifyBox.appendNotification(
								message,
								'fake-readout',
								'chrome://browser/skin/Info.png',
								priority,
								buttons
							);
						}
						break;
				}
			});
		},
	});

}());