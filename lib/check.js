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
		window.scope.check = {};
		scope = window.scope.check;
	}
	
	const settings = require("./settings");
	const lists = require("./lists");
	const {parseErrorStack} = require("./callingStack");
	const logging = require("./logging");

	scope.check = function check({url, errorStack}){
		var match = checkBoth(errorStack, url, settings.blockMode).match(
			/^(block|allow|fake|ask)(|Readout|Everything|Context|Input|Internal)$/
		);
		if (match){
			return {
				type: (match[2] === "Everything" || match[2] === "")?
					["context", "readout", "input"]:
					[match[2].toLowerCase()],
				mode: match[1]
			};
		}
		else {
			return {
				type: ["context", "readout", "input"],
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
		url = new URL(url || "about:blank");
		switch (url.protocol){
			case "about:":
				if (url.href === "about:blank"){
					logging.message("use regular mode on about:blank");
					break;
				}
				logging.message("allow internal URLs");
				return "allowInternal";
			case "chrome:":
				logging.message("allow internal URLs");
				return "allowInternal";
		}
		
		var mode = "block";
		switch (blockMode){
			case "blockEverything":
				mode = "block";
				break;
			case "block":
			case "blockContext":
			case "blockReadout":
			case "blockInput":
			case "ask":
			case "askContext":
			case "askReadout":
			case "askInput":
			case "fake":
			case "fakeContext":
			case "fakeReadout":
			case "fakeInput":
			case "allow":
			case "allowContext":
			case "allowReadout":
			case "allowInput":
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
		var callingStack = parseErrorStack(errorStack);
		return lists.get("stack").match(callingStack);
	}
	scope.checkStack = checkStack;
}());