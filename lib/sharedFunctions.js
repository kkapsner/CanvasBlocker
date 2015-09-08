/* global console,exports */
/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lists = require("./lists");
const preferences = require("sdk/simple-prefs");
const prefs = preferences.prefs;

// Translation
var translate = require("sdk/l10n").get;
var _ = function(name, replace){
	"use strict";
	
	var str = translate(name) || name;
	if (replace){
		// replace generic content in the transation by given parameter
		Object.keys(replace).forEach(function(name){
			str = str.replace(new RegExp("{" + name + "}", "g"), replace[name]);
		});
	}
	return str;
};


function checkURL(url, blockMode){
	"use strict";
	
	if (url.protocol === "about:" || url.protocol === "chrome:") {
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
		case "ask":
		case "askContext":
		case "askReadout":
		case "fake":
		case "fakeContext":
		case "fakeReadout":
		case "allow":
		case "allowContext":
		case "allowReadout":
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


// Stack parsing
function parseStackEntry(entry){
	"use strict";
	
	var m = /@(.*):(\d*):(\d*)$/.exec(entry) || ["", entry, "--", "--"];
	return {
		url: m[1],
		line: m[2],
		column: m[3],
		raw: entry
	};
}

// parse calling stack
function errorToCallingStackMsg(error){
	"use strict";
	
	var msg = "";
	var callers = error.stack.trim().split("\n");
	//console.log(callers);
	var findme = callers.shift(); // Remove us from the stack
	findme = findme.replace(/(:[0-9]+){1,2}$/, ""); // rm line & column
	// Eliminate squashed stack. stack may contain 2+ stacks, but why...
	var inDoubleStack = false;
	callers = callers.filter(function(caller){
		var doubleStackStart = caller.search(findme) !== -1;
		inDoubleStack = inDoubleStack || doubleStackStart;
		return !inDoubleStack;
	});
	msg += "\n\n" + _("sourceOutput") + ": ";
	if (prefs.showCompleteCallingStack){
		msg += callers.reduce(function(stack, c){
			return stack + "\n\t" + _("stackEntryOutput", parseStackEntry(c));
		}, "");
	}
	else{
		msg += _("stackEntryOutput", parseStackEntry(callers[0]));
	}
	
	return msg;
}

exports.checkURL = checkURL;
exports.parseStackEntry = parseStackEntry;
exports.errorToCallingStackMsg = errorToCallingStackMsg;