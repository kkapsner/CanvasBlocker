/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./dataUrls", {});
	}
	
	const logging = require("./logging");
	const settings = require("./settings");
	const settingContainer = require("./settingContainers");
	let canMergeHeader = false;
	let blockBlob = true;
	browser.runtime.getBrowserInfo().then(function(info){
		const mainVersion = parseInt(info.version.replace(/\..+/, ""), 10);
		canMergeHeader = mainVersion > 59;
		blockBlob = mainVersion < 60;
		return canMergeHeader;
	}).catch(function(){
		canMergeHeader = false;
		blockBlob = true;
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
		function listener(details){
			const headers = details.responseHeaders;
			if (
				details.statusCode !== 304 &&
				settings.get("blockDataURLs", new URL(details.url))
			){
				const cspMatch = (blockBlob? "": "blob: ") + "filesystem: *";
				logging.verbose("Adding CSP header to", details);
				setHeader(headers, {
					name: "Content-Security-Policy",
					value: `object-src ${cspMatch}; frame-src ${cspMatch}`
					//	+ "; report-to https://canvasblocker.invalid/; report-uri https://canvasblocker.invalid/"
				});
			}
			return {
				responseHeaders: headers
			};
		}
		function addListener(){
			if (!browser.webRequest.onHeadersReceived.hasListener(listener)){
				logging.message("add listener for CSP headers (data URL protection)");
				browser.webRequest.onHeadersReceived.addListener(
					listener,
					{
						urls: ["<all_urls>"],
						types: ["main_frame", "sub_frame", "object"]
					},
					["blocking", "responseHeaders"]
				);
			}
		}
		function removeListener(){
			if (browser.webRequest.onHeadersReceived.hasListener(listener)){
				logging.message("remove listener for CSP headers (data URL protection)");
				browser.webRequest.onHeadersReceived.removeListener(listener);
			}
		}
		function adjustListener(){
			if (
				settings.blockDataURLs ||
				settingContainer.urlContainer.get().some(function(entry){
					return entry.blockDataURLs;
				})
			){
				addListener();
			}
			else {
				removeListener();
			}
		}
		
		settings.onloaded(adjustListener);
		settings.on("blockDataURLs", adjustListener);
		settingContainer.urlContainer.on(adjustListener);
	};

}());