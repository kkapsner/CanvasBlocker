/* global console,exports */
/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const lists = require("./lists");
	const preferences = require("sdk/simple-prefs");
	const prefs = preferences.prefs;
	const {parseErrorStack} = require("./callingStack");
	const {URL} = require("sdk/url");

	exports.check = function check({url, errorStack}){
		var callingStack = parseErrorStack(errorStack);
		var match = checkBoth(callingStack, url, prefs.blockMode).match(/^(block|allow|fake|ask)(|Readout|Everything|Context|Input)$/);
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

	function checkBoth(stack, url, blockMode){
		if (prefs.enableStackList && checkStack(stack)){
			return "allow";
		}
		else {
			return checkURL(url, blockMode);
		}
	}

	function checkURL(url, blockMode){
		url = new URL(url);
		switch (url.protocol){
			case "about:":
				if (url.href === "about:blank"){
					break;
				}
				return "allow";
			case "chrome:":
				return "allow";
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
				console.log("Unknown blocking mode (" + blockMode + "). Default to block everything.");
		}
		return mode;
	}

	function checkStack(stack){
		return lists.get("stack").match(stack);
	}
}());