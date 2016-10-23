/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


var URL = require("sdk/url").URL;
const {parseErrorStack} = require("./callingStack");

var tabUtils = require("sdk/tabs/utils");
exports.notify = function({url, errorStack, messageId}, {lists, notificationPref, _, browser, window}){
	"use strict";
	var callingStackMsg = parseErrorStack(errorStack);
	
	var contentURL = new URL(url);
	if (notificationPref.doShow() && !lists.get("ignore").match(contentURL)){
		url = contentURL.href;
		var domain = contentURL.hostname;
		var message = _(messageId).replace(/\{url\}/g, domain || url);
		
		var tab, tabBrowser;
		if (browser){
			window = tabUtils.getOwnerWindow(browser);
			tab = tabUtils.getTabForBrowser(browser);
			tabBrowser = tabUtils.getTabBrowser(window);
		}
		else if (window){		
			tab = tabUtils.getTabForContentWindow(window);
			tabBrowser = tabUtils.getTabBrowserForTab(tab);
			browser = tabUtils.getBrowserForTab(tab);
		}
		
		var notifyBox = tabBrowser.getNotificationBox(browser);
		var notification = notifyBox.getNotificationWithValue("fake-readout");
		if (notification){
			notification.label = message;
			notification.url = url;
			notification.domain = domain;
			notification.callingStackMsg = callingStackMsg;
		}
		else {
			var buttons = [
				{
					label: _("displayFullURL"),
					accessKey: "",
					callback: function(){
						window.alert(notification.url);
						// only way to prevent closing... see https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Method/appendNotification#Notification_box_events
						throw new Error("Do not close notification.");
					}
				},
				{
					label: _("displayCallingStack"),
					accessKey: "",
					callback: function(){
						window.alert(notification.callingStackMsg);
						// only way to prevent closing... see https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XUL/Method/appendNotification#Notification_box_events
						throw new Error("Do not close notification.");
					}
				},
				{
					label: _("ignorelistDomain"),
					accessKey: "",
					callback: function(){
						var domain = window.prompt(
							_("inputIgnoreDomain"),
							notification.domain
						);
						if (domain){
							lists.appendTo("ignore", domain);
						}
					}
				},
				{
					label: _("whitelistURL"),
					accessKey: "",
					callback: function(){
						var url = window.prompt(
							_("inputWhitelistDomain"),
							"^" + notification.url.replace(/([\\\+\*\?\[\^\]\$\(\)\{\}\=\!\|\.])/g, "\\$1") + "$"
						);
						if (url){
							lists.appendTo("white", url);
						}
					}
				},
				{
					label: _("whitelistDomain"),
					accessKey: "",
					callback: function(){
						var domain = window.prompt(
							_("inputWhitelistURL"),
							notification.domain
						);
						if (domain){
							lists.appendTo("white", domain);
						}
						
					}
				},
				{
					label: _("disableNotifications"),
					accessKey: "",
					callback: function(){
						notificationPref.setShow(false);
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
			notification.url = url;
			notification.domain = domain;
			notification.callingStackMsg = callingStackMsg;
		}
		return notification;
	}
};