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
	
	function isWhitelisted(url){
		if (!(url instanceof URL)){
			url = new URL(url);
		}
		return lists.get("white").match(url) ||
			lists.get("sessionWhite").match(url) ||
			settings.get("blockMode", url).startsWith("allow");
	}
	
	function getBrowserActionIconName(url, notified){
		if (isWhitelisted(url)){
			return "whitelisted";
		}
		else if (notified) {
			return settings.highlightBrowserAction;
		}
		else {
			return "none";
		}
	}
	
	const paths = {
		pageAction: {
			none: "icons/pageAction-printed.svg",
			color: "icons/pageAction-printedHighlight.svg",
			blink: "icons/pageAction-printedBlink.svg"
		},
		browserAction: {
			none: "icons/browserAction-notPrinted.svg",
			color: "icons/browserAction-printed.svg",
			blink: "icons/browserAction-printedBlink.svg",
			whitelisted: "icons/browserAction-whitelisted.svg"
		}
	};
	
	browser.browserAction.setBadgeBackgroundColor({
		color: "rgba(255, 0, 0, 0.6)"
	});
	
	const apiMap = new Map();
	scope.show = function showNotification(tabId, url, api){
		if (settings.ignoredAPIs[api]){
			return;
		}
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
			path: paths.browserAction[getBrowserActionIconName(url, true)]
		});
		
		let apis = apiMap.get(tabId);
		if (!apis){
			apis = new Set();
		}
		apis.add(api);
		apiMap.set(tabId, apis);
		if (settings.get("displayBadge", url)){
			browser.browserAction.setBadgeText({
				tabId: tabId,
				text: apis.size > 1? apis.size.toString(): api.charAt(0).toUpperCase()
			});
		}
		
		let apiList = "";
		apis.forEach(function(api){
			apiList += browser.i18n.getMessage("browserAction_title_protectedAPIs").replace(/{api}/g, api);
		});
		
		let browserActionTitle = browser.i18n.getMessage("browserAction_title_default");
		if (isWhitelisted(url)){
			browserActionTitle += browser.i18n.getMessage("browserAction_title_whitelisted").replace(/{url}/g, url);
		}
		browserActionTitle += browser.i18n.getMessage("browserAction_title_notified");
		browserActionTitle += apiList;
		browser.browserAction.setTitle({
			tabId: tabId,
			title: browserActionTitle
		});
	};
	
	scope.hide = function hideNotification(tabId, url){
		logging.notice("Hide page action for tab", tabId);
		apiMap.delete(tabId);
		browser.pageAction.hide(tabId);
		browser.pageAction.setIcon({
			tabId: tabId,
			path: paths.pageAction.none
		});
		browser.browserAction.setIcon({
			tabId: tabId,
			path: paths.browserAction[getBrowserActionIconName(url, false)]
		});
		browser.browserAction.setBadgeText({
			tabId: tabId,
			text: ""
		});
		let browserActionTitle = browser.i18n.getMessage("browserAction_title_default");
		if (isWhitelisted(url)){
			browserActionTitle += browser.i18n.getMessage("browserAction_title_whitelisted").replace(/{url}/g, url);
		}
		browser.browserAction.setTitle({
			tabId: tabId,
			title: browserActionTitle
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
	
	browser.tabs.onRemoved.addListener(function(tabId){
		apiMap.delete(tabId);
	});
	settings.on("displayBadge", function({newValue}){
		if (!newValue){
			logging.message("badge was disabled -> hide all badges");
			browser.tabs.query({}).then(function(tabs){
				tabs.forEach(function(tab){
					browser.browserAction.setBadgeText({
						tabId: tab.id,
						text: ""
					});
				});
			});
		}
	});
}());