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
		scope = require.register("./logging", {});
	}

	let settings = false;
	scope.setSettings = async function(realSettings){
		if (!settings){
			settings = realSettings;
			await settings.loaded;
			return scope.clearQueue();
		}
		else {
			warning("logging: Settings can only be set once.");
			return settings.loaded;
		}
	};
	
	let prefix = "";
	
	function leftPad(str, char, pad){
		str = "" + str;
		return char.repeat(pad - str.length) + str;
	}
	
	const colors = {
		1: "color: red",
		25: "color: orange",
		50: "",
		75: "color: darkgreen",
		100: "color: blue",
		999: "background-color: lightgray"
	};
	
	let queue = [];
	function performLog(level, args, date){
		if (!date){
			date = new Date();
		}
		if (!settings || !settings.isInitialized() || queue.length){
			queue.push({level, args, date});
		}
		else {
			if (settings.logLevel >= level){
				let pre = "%c[CanvasBlocker] ";
				if (prefix){
					pre += prefix + ": ";
				}
				pre += "[" +
					date.getFullYear() + "-" +
					leftPad(date.getMonth() + 1, "0", 2) + "-" +
					leftPad(date.getDate(), "0", 2) + " " +
					leftPad(date.getHours(), "0", 2) + ":" +
					leftPad(date.getMinutes(), "0", 2) + ":" +
					leftPad(date.getSeconds(), "0", 2) + "." +
					leftPad(date.getMilliseconds(), "0", 3) +
					"]";
				if (typeof args[0] === "string"){
					args[0] = pre + " " + args[0];
					args.splice(1, 0, colors[level] || "");
				}
				else {
					args.unshift(colors[level] || "");
					args.unshift(pre);
				}
				// eslint-disable-next-line no-console
				console.log.apply(console, args);
			}
		}
	}
	
	function error  (...args){performLog(1,   args);}
	function warning(...args){performLog(25,  args);}
	function message(...args){performLog(50,  args);}
	function notice (...args){performLog(75,  args);}
	function verbose(...args){performLog(100, args);}
	function metaLog(...args){performLog(999, args);}
	
	scope.setPrefix = function(newPrefix){
		if (!prefix){
			prefix = newPrefix;
		}
		else {
			warning("logging prefix already set (%s) cannot be set to %s", prefix, newPrefix);
		}
	};
	scope.clearQueue = function(){
		if (queue.length){
			metaLog("clear logging queue");
			const tmp = queue;
			queue = [];
			tmp.forEach(function(item){
				performLog(item.level, item.args, item.date);
			});
			metaLog("logging queue cleared");
		}
	};
	scope.error = error;
	scope.warning = warning;
	scope.message = message;
	scope.notice = notice;
	scope.verbose = verbose;

	metaLog("logging available");
}());