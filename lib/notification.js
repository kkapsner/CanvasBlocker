/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = {};
		window.scope.notification = scope;
	}
	
	const settings = require("./settings");
	const lists = require("./lists");
	const logging = require("./logging");
	
	const paths = {
		pageAction: {
			none: "icons/pageAction-printed.svg",
			color: "icons/pageAction-printedHighlight.svg",
			blink: "icons/pageAction-printedBlink.svg"
		},
		browserAction: {
			none: "icons/browserAction-notPrinted.svg",
			color: "icons/browserAction-printed.svg",
			blink: "icons/browserAction-printedBlink.svg"
		}
	};
	
	scope.show = function showNotification(tabId, url){
		logging.notice("Show notification for tab", tabId);
		if (
			settings.get("showNotifications", url) &&
			!lists.get("ignore").match(url)
		){
			browser.pageAction.show(tabId);
			browser.pageAction.setIcon({
				tabId: tabId,
				path: paths.pageAction[settings.highlightPageAction]
			});
		}
		browser.browserAction.setIcon({
			tabId: tabId,
			path: paths.browserAction[settings.highlightBrowserAction]
		});
	};
	
	scope.hide = function hideNotification(tabId){
		logging.notice("Hide page action for tab", tabId);
		browser.pageAction.hide(tabId);
		browser.pageAction.setIcon({
			tabId: tabId,
			path: paths.pageAction.none
		});
		browser.browserAction.setIcon({
			tabId: tabId,
			path: paths.browserAction.none
		});
	};
	
	settings.on("showNotifications", function({newValue}){
		if (!newValue){
			logging.message("notifications were disabled -> hide all page actions");
			browser.tabs.query({}).then(function(tabs){
				tabs.forEach(function(tab){
					browser.pageAction.hide(tab.id);
				});
			});
		}
	});
}());