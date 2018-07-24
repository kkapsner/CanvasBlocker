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
	let canMergeHeader = false;
	browser.runtime.getBrowserInfo().then(function(info){
		canMergeHeader = parseInt(info.version.replace(/\..+/, ""), 10) > 59;
	});
	function setHeader(headers, header){
		if (canMergeHeader){
			headers.push(header);
		}
		else {
			const headerName = header.name.toLowerCase();
			const presentHeader = headers.filter(function(h){
				return h.name.toLowerCase() === headerName;
			});
			if (presentHeader.length){
				presentHeader[0].value += ", " + header.value;
			}
			else {
				headers.push(header);
			}
		}
	}
	
	scope.init = function(){
		const cspMatch = "blob: filesystem: *";
		browser.webRequest.onHeadersReceived.addListener(
			function(details){
				const headers = details.responseHeaders;
				if (settings.blockDataURLs){
					logging.verbose("Adding CSP header to", details);
					setHeader(headers, {
						name: "Content-Security-Policy",
						value: `object-src ${cspMatch}; frame-src ${cspMatch}; worker-src ${cspMatch}; child-src ${cspMatch}` +
							"report-to https://canvasblocker.invalid/; report-uri https://canvasblocker.invalid/"
					});
				}
				return {
					responseHeaders: headers
				};
			},
			{
				urls: ["<all_urls>"],
				types: ["main_frame", "sub_frame", "object"]
			},
			["blocking", "responseHeaders"]
		);
	};

}());