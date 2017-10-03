/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Promise.all([
	browser.tabs.query({active: true, currentWindow: true}),
	browser.storage.local.get().then(function(data){
		"use strict";
		Object.keys(data).forEach(function(key){
			settings[key] = data[key];
		});
		settings.isStillDefault = false;
		require("./logging").clearQueue();
		return settings;
	})
]).then(function(values){
	"use strict";
	const [tabs, settings] = values;
	
	const {error, warning, message, notice, verbose, setPrefix: setLogPrefix} = require("./logging");
	const domainNotification = require("./domainNotification");
	const Notification = require("./Notification");
	const {createActionButtons, modalPrompt} = require("./gui");
	setLogPrefix("page action script");

	notice("create global action buttons");

	createActionButtons(
		document.getElementById("globalActions"),
		[{
			name: "disableNotifications",
			callback: function(){
				browser.storage.local.set({showNotifications: false});
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
	
	const lists = require("./lists");
	lists.updateAll();
	const {parseErrorStack} = require("./callingStack");

	verbose("registering domain actions");
	[
		{
			name: "ignorelistDomain",
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
			callback: function({url}){
				alert(url.href);
			}
		},
		{
			name: "displayCallingStack",
			callback: function({errorStack}){
				alert(parseErrorStack(errorStack));
			}
		},
		{
			name: "whitelistURL",
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
				domainNotification(notification.url.hostname, notification.messageId).addNotification(new Notification(notification));
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
	"use strict";
	require("./logging").error(e);
});