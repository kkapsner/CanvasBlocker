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
	
	scope.init = function(){
		browser.webRequest.onHeadersReceived.addListener(
			function(details){
				const headers = details.responseHeaders;
				if (settings.blockDataURLs){
					logging.verbose("Adding CSP header to", details);
					headers.push({
						name: "Content-Security-Policy",
						value: "object-src *; child-src *"
					});
				}
				return {
					responseHeaders: headers
				};
			},
			{
				urls: ["<all_urls>"]
			},
			["blocking", "responseHeaders"]
		);
	};

}());