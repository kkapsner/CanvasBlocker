/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	const settings = require("./settings");
	const lists = require("./lists");
	const {parseErrorStack} = require("./callingStack");
	const {error, warning, message, notice, verbose, setPrefix: setLogPrefix} = require("./logging");
	setLogPrefix("page action script");

	const domainNotification = require("./domainNotification");
	const Notification = require("./Notification");
	const {createActionButtons, modalPrompt} = require("./gui");

	Promise.all([
		browser.tabs.query({active: true, currentWindow: true}),
		settings.loaded
	]).then(function(values){
		const tabs = values[0];
		
		notice("create global action buttons");

		createActionButtons(
			document.getElementById("globalActions"),
			[{
				name: "disableNotifications",
				isIcon: true,
				callback: function(){
					settings.showNotifications = false;
					window.close();
				}
			}],
			undefined
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
							lists.appendTo("ignore", domain);
						}
						window.close();
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
							lists.appendTo("white", domain);
						}
						window.close();
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
							lists.appendTo("white", url);
						}
						window.close();
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
				data["canvasBlocker-notifications"].forEach(function(notification){
					verbose(notification);
					notification.url = new URL(notification.url);
					domainNotification(
						notification.url.hostname,
						notification.messageId
					).addNotification(new Notification(notification));
				});
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