/* jslint moz: true */
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

	function updateList(type){
		"use strict";
		
		lists[type] = getDomainRegExpList(prefs[type + "List"]);
	}
	Object.keys(lists).forEach(function(type){
		"use strict";
		
		preferences.on(type + "List", function(){
			updateList(type);
		});
		updateList(type);
	});

	function updateStackList(){
		var list;
		try {
			var data = JSON.parse(prefs.stackList);
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
	preferences.on("stackList", function(){
		updateStackList();
	});
	updateStackList();

	scope.get = function getList(type){
		"use strict";
		
		return lists[type];
	};
	scope.appendTo = function appendToList(type, entry){
		"use strict";
		
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
		updateStackList();
	};
}());