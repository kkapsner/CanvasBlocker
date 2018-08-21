/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const logging = require("./logging");
	const settings = require("./settings");
	logging.message("Opened browser action");
	
	settings.onloaded(function(){
		// load theme
		var themeLink = document.createElement("link");
		themeLink.href = `browserAction-${settings.theme}.css`;
		themeLink.rel = "stylesheet";
		themeLink.type = "text/css";
		document.head.appendChild(themeLink);
		settings.on("theme", function(){
			themeLink.href = `browserAction-${settings.theme}.css`;
		});
		
		var actions = document.getElementById("actions");
		
		[
			{
				label: "settings",
				icon: browser.extension.getURL("icons/pageAction-showOptions.svg"),
				action: function(){
					if (browser.runtime && browser.runtime.openOptionsPage){
						browser.runtime.openOptionsPage();
					}
					else {
						window.open(browser.extension.getURL("options/options.html"), "_blank");
					}
				}
			},
			{
				label: "test",
				advanced: true,
				icon: browser.extension.getURL("icons/browserAction-test.svg"),
				action: function(){
					window.open("https://canvasblocker.kkapsner.de/test", "_blank");
				}
			},
			{
				label: "review",
				icon: browser.extension.getURL("icons/browserAction-review.svg"),
				action: function(){
					window.open("https://addons.mozilla.org/firefox/addon/canvasblocker/reviews/", "_blank");
				}
			},
			{
				label: "reportIssue",
				icon: browser.extension.getURL("icons/browserAction-reportIssue.svg"),
				action: function(){
					window.open("https://github.com/kkapsner/CanvasBlocker/issues", "_blank");
				}
			},
		].forEach(function(action){
			logging.verbose("Action", action);
			if (action.advanced && !settings.displayAdvancedSettings){
				logging.verbose("Hiding advanced action");
				return;
			}
			var actionButton = document.createElement("button");
			actionButton.className = "action";
			
			var icon = document.createElement("span");
			icon.className = "icon";
			icon.style.maskImage = "url(" + action.icon + ")";
			
			actionButton.appendChild(icon);
			
			actionButton.appendChild(
				document.createTextNode(
					browser.i18n.getMessage("browserAction_" + action.label) || action.label
				)
			);
			actionButton.addEventListener("click", action.action);
			actions.appendChild(actionButton);
		});
	});
}());