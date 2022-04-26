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
		scope = require.register("./lists", {});
	}
	
	const settings = require("./settings");
	const logging = require("./logging");
	
	
	function getDomainRegExpList(domainList){
		const list = domainList
			.split(",")
			.map(function(entry){
				return entry.replace(/^\s+|\s+$/g, "");
			})
			.filter(function(entry){
				return !!entry.length;
			})
			.map(function(entry){
				let regExp;
				const domain = !!entry.match(/^[A-Za-z0-9_.*-]+$/);
				if (domain){
					regExp = new RegExp(
						"(?:^|\\.)" + entry.replace(/([\\+?[^\]$(){}=!|.])/g, "\\$1").replace(/\*/g, ".+") + "\\.?$",
						"i"
					);
				}
				else {
					try {
						regExp = new RegExp(entry, "i");
					}
					catch (error){
						logging.error("Error in regular expression", entry, error);
						regExp = new RegExp(
							"(?:^|\\.)" + entry.replace(/([\\+*?[^\]$(){}=!|.])/g, "\\$1") + "\\.?$",
							"i"
						);
					}
				}
				return {
					value: entry,
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
			
		return addMatchToList(list);
	}
	function addMatchToList(list){
		list.match = function(url){
			return this.some(function(entry){
				return entry.match(url);
			});
		};
		
		return list;
	}

	const lists = {
		white: [],
		sessionWhite: [],
		"ignore": [],
		black: []
	};

	function updateList(type, value){
		if (typeof value === "undefined"){
			value = settings[type + "List"];
		}
		lists[type] = getDomainRegExpList(value);
		return lists[type];
	}
	Object.keys(lists).forEach(function(type){
		settings.on(type + "List", function({newValue}){
			updateList(type, newValue);
		});
		updateList(type, settings[type + "List"]);
	});

	function updateStackList(value){
		let list;
		try {
			let data = JSON.parse(value);
			if (!Array.isArray(data)){
				data = [data];
			}
			list = data.filter(function(entry){
				return typeof entry === "object" && typeof entry.url === "string";
			});
		}
		catch(error){
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
	settings.on("stackList", function({newValue}){
		updateStackList(newValue);
	});
	updateStackList(settings.stackList);

	scope.get = function getList(type){
		if (type === "white"){
			const combined = lists.white.slice().concat(lists.sessionWhite);
			return addMatchToList(combined);
		}
		return lists[type];
	};
	scope.appendTo = async function appendToList(type, entry){
		const oldValue = settings[type + "List"];
		await settings.set(type + "List", oldValue + (oldValue? ",": "") + entry);
		return updateList(type);
	};
	scope.removeFrom = async function removeFromList(type, entry){
		const oldValue = settings[type + "List"];
		const filter = entry.forEach? v => entry.indexOf(v) === -1: v => v !== entry;
		await settings.set(
			type + "List",
			oldValue
				.split(",")
				.map(v => v.replace(/^\s+|\s+$/, ""))
				.filter(filter)
				.join(",")
		);
		return updateList(type);
	};
	scope.update = updateList;
	scope.updateAll = function updateAllLists(){
		updateList("white");
		updateList("sessionWhite");
		updateList("ignore");
		updateList("black");
		updateStackList(settings.stackList);
	};
	settings.onloaded(scope.updateAll);
}());