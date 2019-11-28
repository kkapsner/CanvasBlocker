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
		scope = require.register("./callingStack", {});
	}

	const settings = require("./settings");
	const extension = require("./extension");
	
	// Translation
	const _ = function(name, replace, translateAPI){
		if (!translateAPI){
			translateAPI = extension.getTranslation;
		}
		
		let str = translateAPI(name) || name;
		if (replace){
			// replace generic content in the translation by given parameter
			Object.keys(replace).forEach(function(name){
				str = str.replace(new RegExp("{" + name + "}", "g"), replace[name]);
			});
		}
		return str;
	};
	
	// Stack parsing
	function parseStackEntry(entry){
		const m = /@(.*):(\d*):(\d*)$/.exec(entry) || ["", entry, "--", "--"];
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
	const extensionID = extension.extensionID;
	function parseErrorStack(errorStack){
		const callers = errorStack.trim().split("\n").map(parseStackEntry).filter(function(caller){
			return !caller.url.startsWith(extensionID);
		});
		return {
			toString: function(translateAPI){
				let msg = "";
				msg += "\n\n" + _("sourceOutput", undefined, translateAPI) + ": ";
				if (settings.showCompleteCallingStack){
					msg += callers.reduce(function(stack, c){
						return stack + "\n\t" + _("stackEntryOutput", c, translateAPI);
					}, "");
				}
				else{
					msg += _("stackEntryOutput", callers[0], translateAPI);
				}
				
				return msg;
			},
			match: function(stackRule){
				if (typeof stackRule.stackPosition !== "undefined"){
					let pos = stackRule.stackPosition;
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
	
	scope.parseErrorStack = parseErrorStack;
}());