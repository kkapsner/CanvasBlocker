/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./notification", {});
	}
	
	const extension = require("./extension");
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
	
	function getBrowserActionIconName(tabData, notified){
		if (tabData.whitelisted){
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
	
	if (browser.browserAction.setBadgeBackgroundColor){
		browser.browserAction.setBadgeBackgroundColor({
			color: "rgba(255, 0, 0, 0.6)"
		});
	}
	
	const tabsData = new Map();
	function getTabData(tabId){
		let data = tabsData.get(tabId);
		if (!data){
			data = {
				url: "",
				apis: new Set(),
				whitelisted: false
			};
			tabsData.set(tabId, data);
		}
		return data;
	}
	scope.show = function showNotification(tabId, url, api){
		if (settings.ignoredAPIs[api]){
			return;
		}
		logging.notice("Show notification for tab", tabId);
		const tabData = getTabData(tabId);
		if (
			settings.get("showNotifications", url) &&
			!lists.get("ignore").match(url)
		){
			browser.pageAction.show(tabId);
			if (browser.pageAction.setIcon){
				browser.pageAction.setIcon({
					tabId: tabId,
					path: paths.pageAction[settings.highlightPageAction]
				});
			}
		}
		if (browser.browserAction.setIcon){
			browser.browserAction.setIcon({
				tabId: tabId,
				path: paths.browserAction[getBrowserActionIconName(tabData, true)]
			});
		}
		
		const apis = tabData.apis;
		apis.add(api);
		if (
			settings.get("displayBadge", url) &&
			browser.browserAction.setBadgeText
		){
			browser.browserAction.setBadgeText({
				tabId: tabId,
				text: apis.size > 1? apis.size.toString(): api.charAt(0).toUpperCase()
			});
		}
		
		let apiList = "";
		apis.forEach(function(api){
			apiList += extension.getTranslation("browserAction_title_protectedAPIs").replace(/{api}/g, api);
		});
		
		let browserActionTitle = extension.getTranslation("browserAction_title_default");
		if (tabData.whitelisted){
			browserActionTitle += extension.getTranslation("browserAction_title_whitelisted")
				.replace(/{url}/g, tabData.url);
		}
		browserActionTitle += extension.getTranslation("browserAction_title_notified");
		browserActionTitle += apiList;
		browser.browserAction.setTitle({
			tabId: tabId,
			title: browserActionTitle
		});
	};
	
	scope.hide = function hideNotification(tabId, url){
		logging.notice("Hide page action for tab", tabId);
		// clear old data
		tabsData.delete(tabId);
		const tabData = getTabData(tabId);
		tabData.url = url;
		tabData.whitelisted = isWhitelisted(url);
		
		browser.pageAction.hide(tabId);
		if (browser.pageAction.setIcon){
			browser.pageAction.setIcon({
				tabId: tabId,
				path: paths.pageAction.none
			});
		}
		if (browser.browserAction.setIcon){
			browser.browserAction.setIcon({
				tabId: tabId,
				path: paths.browserAction[getBrowserActionIconName(tabData, false)]
			});
		}
		if (browser.browserAction.setBadgeText){
			browser.browserAction.setBadgeText({
				tabId: tabId,
				text: ""
			});
		}
		let browserActionTitle = extension.getTranslation("browserAction_title_default");
		if (tabData.whitelisted){
			browserActionTitle += extension.getTranslation("browserAction_title_whitelisted").replace(/{url}/g, url);
		}
		browser.browserAction.setTitle({
			tabId: tabId,
			title: browserActionTitle
		});
	};
	
	settings.on("showNotifications", async function({newValue}){
		if (!newValue){
			logging.message("notifications were disabled -> hide all page actions");
			const tabs = await browser.tabs.query({});
			tabs.forEach(function(tab){
				browser.pageAction.hide(tab.id);
			});
		}
	});
	
	browser.tabs.onRemoved.addListener(function(tabId){
		tabsData.delete(tabId);
	});
	settings.on("displayBadge", async function({newValue}){
		if (!newValue){
			logging.message("badge was disabled -> hide all badges");
			if (browser.browserAction.setBadgeText){
				const tabs = await browser.tabs.query({});
				tabs.forEach(function(tab){
					browser.browserAction.setBadgeText({
						tabId: tab.id,
						text: ""
					});
				});
			}
		}
	});
}());