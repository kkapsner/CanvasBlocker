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

function check(stack, url, blockMode){
	if (prefs.enableStackList && checkStack(stack)){
		return "allow";
	}
	else {
		return checkURL(url, blockMode);
	}
}

function checkURL(url, blockMode){
	"use strict";
	
	switch (url.protocol){
		case "about:":
			if (url.href === "about:blank"){
				break;
			}
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

function checkStack(stack){
	"use strict";
	
	return lists.get("stack").match(stack);
}

// Stack parsing
function parseStackEntry(entry){
	"use strict";
	
	var m = /@(.*):(\d*):(\d*)$/.exec(entry) || ["", entry, "--", "--"];
	return {
		url: m[1],
		line: parseInt(m[2], 10),
		column: parseInt(m[3], 10),
		raw: entry
	};
}

function stackRuleMatch(stackEntry, stackRule){
	if (!stackEntry){
		return false;
	}
	if (stackEntry.url !== stackRule.url){
		return false;
	}
	if ((typeof stackRule.line) !== "undefined" && stackEntry.line !== stackRule.line){
		return false;
	}
	if ((typeof stackRule.column) !== "undefined" && stackEntry.column !== stackRule.column){
		return false;
	}
	return true;
}

// parse calling stack
function errorToCallingStack(error){
	"use strict";
	
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
	}).map(parseStackEntry);
	return {
		toString: function(){
			var msg = "";
			msg += "\n\n" + _("sourceOutput") + ": ";
			if (prefs.showCompleteCallingStack){
				msg += callers.reduce(function(stack, c){
					return stack + "\n\t" + _("stackEntryOutput", c);
				}, "");
			}
			else{
				msg += _("stackEntryOutput", callers[0]);
			}
			
			return msg;
		},
		match: function(stackRule){
			if (typeof stackRule.stackPosition !== "undefined"){
				var pos = stackRule.stackPosition;
				if (pos < 0){
					pos += callers.length;
				}
				return stackRuleMatch(callers[pos], stackRule);
			}
			else {
				return callers.some(function(stackEntry){
					return stackRuleMatch(stackEntry, stackRule);
				});
			}
		}
	};
}

exports.check = check;
exports.parseStackEntry = parseStackEntry;
exports.errorToCallingStack = errorToCallingStack;