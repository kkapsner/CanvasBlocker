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
		scope = require.register("./check", {});
	}
	
	const settings = require("./settings");
	const lists = require("./lists");
	const {parseErrorStack} = require("./callingStack");
	const logging = require("./logging");

	scope.check = function check({url, errorStack}){
		url = new URL(url || "about:blank");
		const match = checkBoth(errorStack, url, settings.get("blockMode", url)).match(
			/^(block|allow|fake|ask)(|Everything|Internal)$/
		);
		if (match){
			return {
				url: url,
				internal: match[2] === "Internal",
				mode: match[1]
			};
		}
		else {
			return {
				url: url,
				internal: false,
				mode: "block"
			};
		}
		
	};

	function checkBoth(errorStack, url, blockMode){
		if (settings.enableStackList && errorStack && checkStack(errorStack)){
			return "allow";
		}
		else {
			return checkURL(url, blockMode);
		}
	}

	function checkURL(url, blockMode){
		logging.message("check url %s for block mode %s", url, blockMode);
		switch (url.protocol){
			case "about:":
				if (url.pathname === "blank"){
					logging.message("use regular mode on about:blank");
					break;
				}
				logging.message("allow internal URLs");
				return "allowInternal";
			case "chrome:":
				logging.message("allow internal URLs");
				return "allowInternal";
		}
		
		let mode = "block";
		switch (blockMode){
			case "blockEverything":
				mode = "block";
				break;
			case "block":
			case "ask":
			case "fake":
			case "allow":
				if (url && lists.get("white").match(url)){
					mode = "allow";
				}
				else if (url && lists.get("black").match(url)){
					mode = "block";
				}
				else {
					mode = blockMode;
				}
				break;
			case "allowEverything":
				mode = "allow";
				break;
			default:
				logging.warning("Unknown blocking mode (" + blockMode + "). Default to block everything.");
		}
		return mode;
	}

	function checkStack(errorStack){
		if (settings.enableStackList){
			const stackList = lists.get("stack");
			if (stackList.length){
				const callingStack = parseErrorStack(errorStack);
				return stackList.match(callingStack);
			}
		}
		return false;
	}
	scope.checkStack = checkStack;
}());