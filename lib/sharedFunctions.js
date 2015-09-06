/* global console,exports */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const lists = require("./lists");
const preferences = require("sdk/simple-prefs");
const prefs = preferences.prefs;

// Translation
var translate = require("sdk/l10n").get;
var _ = function(name, replace){
	var str = translate(name) || name;
	if (replace){
		// replace generic content in the transation by given parameter
		Object.keys(replace).forEach(function(name){
			str = str.replace(new RegExp("{" + name + "}", "g"), replace[name]);
		});
	}
	return str;
};

function getDomainRegExpList(domainList){
	"use strict";
	
	var list = domainList
		.split(",")
		.map(function(entry){
			return entry.replace(/^\s+|\s+$/g, "");
		})
		.filter(function(entry){
			return !!entry.length;
		})
		.map(function(entry){
			var regExp;
			var domain = !!entry.match(/^[\w.]+$/);
			if (domain){
				regExp = new RegExp("(?:^|\\.)" + entry.replace(/([\\\+\*\?\[\^\]\$\(\)\{\}\=\!\|\.])/g, "\\$1") + "\\.?$", "i");
			}
			else {
				regExp = new RegExp(entry, "i");
			}
			return {
				match: function(url){
					if (domain){
						return url.hostname.match(regExp);
					}
					else {
						return url.href.match(regExp);
					}
				}
			};
		});
		
		list.match = function(url){
			return this.some(function(entry){
				return entry.match(url);
			});
		};
		
		return list;
}

function checkURL(url, blockMode){
	"use strict";
	if (url.protocol === "about:") {
		return "unblock";
	}
	
	var mode = "block";
	switch (blockMode){
		case "blockEverything":
			mode = "block";
			break;
		case "fakeReadout":
			if (url && lists.get("white").match(url)){
				mode = "unblock";
			}
			else if (url && lists.get("black").match(url)){
				mode = "block";
			}
			else {
				mode = blockMode;
			}
			break;
		case "allowEverything":
			mode = "unblock";
			break;
		default:
			console.log("Unknown blocking mode (" + blockMode + "). Default to block everything.");
	}
	return mode;
}


// Stack parsing
function parseStackEntry(entry){
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


exports.getDomainRegExpList = getDomainRegExpList;
exports.checkURL = checkURL;
exports.parseStackEntry = parseStackEntry;
exports.errorToCallingStackMsg = errorToCallingStackMsg;