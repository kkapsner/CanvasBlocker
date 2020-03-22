/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const extension = require("../lib/extension");
	const logging = require("../lib/logging");
	const settings = require("../lib/settings");
	require("../lib/theme").init();
	logging.message("Opened browser action");
	
	settings.onloaded(function(){
		const actions = document.getElementById("actions");
		
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
				label: "faq",
				icon: browser.extension.getURL("icons/browserAction-faq.svg"),
				action: function(){
					window.open("https://canvasblocker.kkapsner.de/faq/", "_blank");
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
			const actionButton = document.createElement("button");
			actionButton.className = "action";
			
			const icon = document.createElement("span");
			icon.className = "icon";
			icon.style.maskImage = "url(" + action.icon + ")";
			
			actionButton.appendChild(icon);
			
			actionButton.appendChild(
				document.createTextNode(
					extension.getTranslation("browserAction_" + action.label) || action.label
				)
			);
			actionButton.addEventListener("click", action.action);
			actions.appendChild(actionButton);
		});
		
		const search = document.createElement("input");
		search.placeholder = extension.getTranslation("search");
		search.className = "search action";
		actions.appendChild(search);
		search.focus();
		
		search.addEventListener("keypress", function(event){
			if ([10, 13].indexOf(event.keyCode) !== -1){
				window.open(browser.extension.getURL(
					"options/options.html" +
					"?search=" +
					encodeURIComponent(this.value)
				));
				window.close();
			}
		});
	});
}());