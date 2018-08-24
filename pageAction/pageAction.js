/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	const settings = require("./settings");
	const {parseErrorStack} = require("./callingStack");
	const {error, warning, message, notice, verbose, setPrefix: setLogPrefix} = require("./logging");
	setLogPrefix("page action script");

	const domainNotification = require("./domainNotification");
	const Notification = require("./Notification");
	const {createActionButtons, modalPrompt} = require("./gui");
	const lists = require("./lists");

	Promise.all([
		browser.tabs.query({active: true, currentWindow: true}),
		settings.loaded
	]).then(function(values){
		const tabs = values[0];
		
		notice("create global action buttons");

		createActionButtons(
			document.getElementById("globalActions"),
			[
				{
					name: "showOptions",
					isIcon: true,
					callback: function(){
						if (browser.runtime && browser.runtime.openOptionsPage){
							browser.runtime.openOptionsPage();
						}
						else {
							window.open(browser.extension.getURL("options/options.html"), "_blank");
						}
					}
				},
				{
					name: "disableNotifications",
					isIcon: true,
					callback: function(){
						settings.set("showNotifications", false).then(function(){
							window.close();
						});
					}
				}
			],
			undefined,
			true
		);
		
		if (!tabs.length){
			throw new Error("noTabsFound");
		}
		else if (tabs.length > 1){
			error(tabs);
			throw new Error("tooManyTabsFound");
		}
		

		verbose("registering domain actions");
		[
			{
				name: "ignorelistDomain",
				isIcon: true,
				callback: function(domain){
					modalPrompt(
						browser.i18n.getMessage("inputIgnoreDomain"),
						domain
					).then(function(domain){
						if (domain){
							settings.set("showNotifications", false, domain).then(function(){
								window.close();
							});
						}
						else {
							window.close();
						}
					});
				}
			},
			{
				name: "whitelistDomain",
				isIcon: true,
				callback: function(domain){
					modalPrompt(
						browser.i18n.getMessage("inputWhitelistURL"),
						domain
					).then(function(domain){
						if (domain){
							settings.set("blockMode", "allow", domain).then(function(){
								window.close();
							});
						}
						else {
							window.close();
						}
					});
				}
			},
			{
				name: "whitelistDomainTemporarily",
				isIcon: true,
				callback: function(domain){
					modalPrompt(
						browser.i18n.getMessage("inputSessionWhitelistURL"),
						domain
					).then(function(domain){
						if (domain){
							lists.appendTo("sessionWhite", domain).then(function(){
								window.close();
							});
						}
						else {
							window.close();
						}
					});
				}
			}
		].forEach(function(domainAction){
			domainNotification.addAction(domainAction);
		});

		verbose("registering notification actions");
		[
			{
				name: "displayFullURL",
				isIcon: true,
				callback: function({url}){
					alert(url.href);
				}
			},
			{
				name: "displayCallingStack",
				isIcon: true,
				callback: function({errorStack}){
					alert(parseErrorStack(errorStack));
				}
			},
			{
				name: "whitelistURL",
				isIcon: true,
				callback: function({url}){
					modalPrompt(
						browser.i18n.getMessage("inputWhitelistDomain"),
						"^" + url.href.replace(/([\\+*?[^\]$(){}=!|.])/g, "\\$1") + "$"
					).then(function(url){
						if (url){
							settings.set("blockMode", "allow", url).then(function(){
								window.close();
							});
						}
						else {
							window.close();
						}
					});
				}
			},
			{
				name: "whitelistURLTemporarily",
				isIcon: true,
				callback: function({url}){
					modalPrompt(
						browser.i18n.getMessage("inputSessionWhitelistDomain"),
						"^" + url.href.replace(/([\\+*?[^\]$(){}=!|.])/g, "\\$1") + "$"
					).then(function(url){
						if (url){
							lists.appendTo("sessionWhite", url).then(function(){
								window.close();
							});
						}
						else {
							window.close();
						}
					});
				}
			}
		].forEach(function(action){
			Notification.addAction(action);
		});
		
		var tab = tabs[0];
		browser.runtime.onMessage.addListener(function(data){
			if (Array.isArray(data["canvasBlocker-notifications"])){
				message("got notifications");
				const notifications = data["canvasBlocker-notifications"];
				let i = 0;
				const length = notifications.length;
				const tick = window.setInterval(function(){
					if (i >= length){
						window.clearInterval(tick);
					}
					else {
						for (var delta = 0; delta < 20 && i + delta < length; delta += 1){
							let notification = notifications[i + delta];
							if (settings.ignoredAPIs[notification.api]){
								continue;
							}
							verbose(notification);
							notification.url = new URL(notification.url);
							domainNotification(
								notification.url.hostname,
								notification.messageId
							).addNotification(new Notification(notification));
						}
						i += delta;
					}
				}, 1);
			}
		});
		message("request notifications from tab", tab.id);
		browser.tabs.sendMessage(
			tab.id,
			{
				"canvasBlocker-sendNotifications": tab.id
			}
		);
		notice("waiting for notifications");
	}).catch(function(e){
		error(e);
	});
}());