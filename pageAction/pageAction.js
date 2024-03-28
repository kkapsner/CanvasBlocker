/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(async function(){
	"use strict";

	const extension = require("../lib/extension");
	const settings = require("../lib/settings");
	const {parseErrorStack} = require("../lib/callingStack");
	const logging = require("../lib/logging");
	logging.setPrefix("page action script");
	
	window.addEventListener("load", async function(){
		extension.displayVersion("version", 250);
	});

	const domainNotification = require("./domainNotification");
	const Notification = require("./Notification");
	const {createActionButtons, modalPrompt, modalChoice} = require("./gui");
	const lists = require("../lib/lists");
	require("../lib/theme").init("pageAction");
	
	function registerActionButtons(){
		logging.notice("create global action buttons");

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
							browser.tabs.create({url: extension.getURL("options/options.html")});
						}
					}
				},
				{
					name: "disableNotifications",
					isIcon: true,
					callback: async function(){
						await settings.set("showNotifications", false);
						window.close();
					}
				}
			],
			undefined,
			true
		);
	}
	
	const domainActions = [
		{
			name: "ignorelist",
			isIcon: true,
			callback: async function({domain, urls}){
				const choice = await domainOrUrlPicker(
					domain,
					urls,
					extension.getTranslation("selectIgnore"),
					extension.getTranslation("inputIgnoreURL")
				);
				
				if (choice){
					await settings.set("showNotifications", false, choice);
				}
				window.close();
			}
		},
		{
			name: "whitelist",
			isIcon: true,
			callback: async function({domain, urls, api}){
				const whitelistingSettings = {
					all: {name: "blockMode", value: "allowEverything", fakeValue: "fake"},
					canvas: {name: "protectedCanvasPart", value: "nothing"},
					audio: {name: "protectAudio", value: false},
					domRect: {name: "protectDOMRect", value: false},
					svg: {name: "protectSVG", value: false},
					history: {name: "historyLengthThreshold", value: 10000},
					navigator: {name: "protectNavigator", value: false},
					windows: {name: "protectWindow", value: false},
					screen: {name: "protectScreen", value: false},
				};
				const choice = await domainOrUrlPicker(
					domain,
					urls,
					extension.getTranslation("selectWhitelist"),
					extension.getTranslation("inputWhitelistURL")
				);
				let setting = whitelistingSettings.all;
				if (
					api &&
					whitelistingSettings[api]
				){
					setting = whitelistingSettings[await modalChoice(
						extension.getTranslation("selectWhitelistScope"),
						[
							{
								text: extension.getTranslation("whitelistOnlyAPI")
									.replace(
										/\{api\}/g,
										extension.getTranslation("section_" + api + "-api")
									),
								value: api
							},
							{
								text: extension.getTranslation("whitelistAllAPIs"),
								value: "all"
							}
						]
					)];
				}
				if (choice){
					if (setting === whitelistingSettings.all && settings.get(setting.name, choice).startsWith("block")){
						setting.value = await modalChoice(
							extension.getTranslation("selectWhitelistType"),
							[
								{
									text: extension.getTranslation("blockMode_options." + setting.value),
									value: setting.value
								},
								{
									text: extension.getTranslation("blockMode_options." + setting.fakeValue),
									value: setting.fakeValue
								}
							]
						);
					}
					await settings.set(setting.name, setting.value, choice);
				}
				
				window.close();
			}
		},
		{
			name: "whitelistTemporarily",
			isIcon: true,
			callback: async function({domain, urls}){
				const choice = await domainOrUrlPicker(
					domain,
					urls,
					extension.getTranslation("selectSessionWhitelist"),
					extension.getTranslation("inputSessionWhitelistURL")
				);
				if (choice){
					await lists.appendTo("sessionWhite", choice);
				}
				window.close();
			}
		},
		{
			name: "inspectWhitelist",
			isIcon: true,
			callback: function({domain, urls}){
				browser.tabs.create({url: extension.getURL(
					"options/whitelist.html?domain=" +
					encodeURIComponent(domain) +
					"&urls=" +
					encodeURIComponent(JSON.stringify(Array.from(urls.values())))
				)});
			}
		}
	];
	function registerDomainActions(){
		logging.verbose("registering domain actions");
		domainActions.forEach(function(domainAction){
			domainNotification.addAction(domainAction);
		});
	}
	
	function registerNotificationActions(){
		logging.verbose("registering notification actions");
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
			}
		].forEach(function(action){
			Notification.addAction(action);
		});
	}
	
	async function domainOrUrlPicker(domain, urls, selectText, urlInputText){
		const choices = Array.from(urls).map(function(url){
			return {
				text: url,
				value: "^" + url.replace(/([\\+*?[^\]$(){}=!|.])/g, "\\$1") + "$"
			};
		});
		if (domain){
			choices.unshift(domain);
		}
		const choice = await modalChoice(
			selectText,
			choices
		);
		if (choice.startsWith("^")){
			return modalPrompt(
				urlInputText,
				choice
			);
		}
		else {
			return choice;
		}
	}
	
	const values = await Promise.all([
		browser.tabs.query({active: true, currentWindow: true}),
		settings.loaded
	]);
	const tabs = values[0];
	
	if (!tabs.length){
		throw new Error("noTabsFound");
	}
	else if (tabs.length > 1){
		logging.error(tabs);
		throw new Error("tooManyTabsFound");
	}
	
	registerActionButtons();
	
	registerDomainActions();
	
	registerNotificationActions();
	
	const tab = tabs[0];
	extension.message.on(function(data){
		if (data["canvasBlocker-notificationCounter"]){
			const url = new URL(data.url);
			Object.keys(data["canvasBlocker-notificationCounter"]).forEach(function(key){
				domainNotification(
					url,
					key,
					data["canvasBlocker-notificationCounter"][key].count,
					data["canvasBlocker-notificationCounter"][key].api
				);
			});
		}
		if (
			Array.isArray(data["canvasBlocker-notifications"]) &&
			data["canvasBlocker-notifications"].length
		){
			logging.message("got notifications");
			const notifications = data["canvasBlocker-notifications"];
			let i = 0;
			const length = notifications.length;
			const tick = window.setInterval(function(){
				if (i >= length){
					window.clearInterval(tick);
				}
				else {
					let delta = 0;
					for (; delta < 20 && i + delta < length; delta += 1){
						let notification = notifications[i + delta];
						logging.verbose(notification);
						if (settings.ignoredAPIs[notification.api]){
							continue;
						}
						logging.verbose(notification);
						notification.url = new URL(notification.url);
						domainNotification(
							notification.url,
							notification.messageId,
							0,
							notification.api
						).addNotification(new Notification(notification));
					}
					i += delta;
				}
			}, 1);
		}
	});
	logging.message("request notifications from tab", tab.id);
	browser.tabs.sendMessage(
		tab.id,
		{
			"canvasBlocker-sendNotifications": tab.id
		}
	);
	logging.notice("waiting for notifications");
}());