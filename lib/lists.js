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
		window.scope.lists = {};
		scope = window.scope.lists;
	}
	
	var preferences = require("sdk/simple-prefs");
	var prefs = preferences.prefs;
	
	
	function getDomainRegExpList(domainList){
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
					regExp = new RegExp("(?:^|\\.)" + entry.replace(/([\\+*?[^\]$(){}=!|.])/g, "\\$1") + "\\.?$", "i");
				}
				else {
					regExp = new RegExp(entry, "i");
				}
				return {
					match: function(url){
						if (domain){
							return (url.hostname || "").match(regExp);
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

	var lists = {
		white: [],
		"ignore": [],
		black: []
	};

	function updateList(type, value){
		if (typeof value === "undefined"){
			value = prefs[type + "List"];
		}
		lists[type] = getDomainRegExpList(value);
	}
	Object.keys(lists).forEach(function(type){
		preferences.on(type + "List", function(value){
			updateList(type, value);
		});
		updateList(type, prefs[type + "List"]);
	});

	function updateStackList(value){
		var list;
		try {
			var data = JSON.parse(value);
			if (!Array.isArray(data)){
				data = [data];
			}
			list = data.filter(function(entry){
				return typeof entry === "object" && typeof entry.url === "string";
			});
		}
		catch(e){
			list = [];
		}
		list.match = function(stack){
			return this.some(function(stackRule){
				return stack.match(stackRule);
			});
		};
		lists.stack = list;
	}
	lists.stack = [];
	preferences.on("stackList", function(value){
		updateStackList(value);
	});
	updateStackList(prefs.stackList);

	scope.get = function getList(type){
		return lists[type];
	};
	scope.appendTo = function appendToList(type, entry){
		prefs[type + "List"] += (prefs[type + "List"]? ",": "") + entry;
		var obj = {};
		obj[type + "List"] = prefs[type + "List"];
		browser.storage.local.set(obj);
		updateList(type);
	};
	scope.update = updateList;
	scope.updateAll = function updateAllLists(){
		updateList("white");
		updateList("ignore");
		updateList("black");
		updateStackList(prefs.stackList);
	};
}());