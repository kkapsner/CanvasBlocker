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
		window.scope.dataUrls = {};
		scope = window.scope.dataUrls;
	}
	
	const logging = require("./logging");
	const settings = require("./settings");
	

	const dataUrlFrames = new Set();
	scope.init = function(){
		browser.webRequest.onBeforeRequest.addListener(
			function(details){
				if (
					details.url.startsWith("data:text")
				){
					dataUrlFrames.add(details.frameId);
					logging.message("Detected data URL", details);
				}
				else if (
					settings.blockRequestsFromDataURL &&
					dataUrlFrames.has(details.frameId)
				){
					logging.warning("Blocking request from data-URL frame.", details);
					if (
						settings.get("showNotifications")
					){
						browser.pageAction.show(details.tabId);
					}
					return {cancel: true};
				}
			},
			{
				urls: ["<all_urls>"]
			},
			["blocking"]
		);
	};

}());