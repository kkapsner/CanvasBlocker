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
		scope = require.register("./navigator", {});
	}
	
	const settings = require("./settings");
	const logging = require("./logging");
	const check = require("./check");
	
	scope.allProperties = [
		"appCodeName", "appName",
		"appVersion", "buildID", "oscpu", "platform",
		"product",
		"productSub", "userAgent", "vendor", "vendorSub"];
	const original = {};
	scope.allProperties.forEach(function(property){
		original[property] = window.navigator[property];
	});
	original["real Firefox version"] = window.navigator.userAgent.replace(/^.+Firefox\//, "");
	
	let changedValues = {};
	
	settings.onloaded(function(){
		changedValues = settings.navigatorDetails;
	});
	settings.on("navigatorDetails", function({newValue}){
		changedValues = newValue;
	});
	
	
	function getValue(name, stack = []){
		if (stack.indexOf(name) !== -1){
			return "[ERROR: loop in property definition]";
		}
		stack.push(name);
		
		switch (name){
			case "original value":
				return original[stack[stack.length - 2]];
			case "random":
				return String.fromCharCode(Math.floor(65 + 85 * Math.random()));
			default:
				if (changedValues.hasOwnProperty(name)){
					return parseString(changedValues[name], stack.slice());
				}
				else {
					return original[name];
				}
		}
	}
	function parseString(string, stack){
		return string.replace(/{([a-z[\]_. -]*)}/ig, function(m, name){
			return getValue(name, stack.slice());
		});
	}
	
	scope.getNavigatorValue = function getNavigatorValue(name){
		return getValue(name);
	};
	
	function changeHTTPHeader(details){
		const url = new URL(details.url);
		if (
			settings.get("protectNavigator", url) &&
			check.check({url}).mode !== "allow" &&
			(
				!settings.protectedAPIFeatures.hasOwnProperty("userAgent @ navigator") ||
				settings.protectedAPIFeatures["userAgent @ navigator"]
			)
		){
			for (let header of details.requestHeaders){
				if (header.name.toLowerCase() === "user-agent"){
					header.value = getValue("userAgent");
				}
			}
		}
		return details;
	}
	
	scope.registerHeaderChange = function(){
		logging.message("Register HTTP header modification for navigator protection.");
		if (!browser.webRequest.onBeforeSendHeaders.hasListener(changeHTTPHeader)){
			browser.webRequest.onBeforeSendHeaders.addListener(
				changeHTTPHeader,
				{
					urls: ["<all_urls>"],
				},
				["blocking", "requestHeaders"]);
		}
	};
	scope.unregisterHeaderChange = function(){
		logging.message("Removing header modification for navigator protection.");
		browser.webRequest.onBeforeSendHeaders.removeListener(changeHTTPHeader);
	};
	scope.init = function (){
		settings.onloaded(function(){
			if (!settings.protectNavigator){
				scope.unregisterHeaderChange();
			}
		});
		settings.on("protectNavigator", function({newValue}){
			if (newValue){
				scope.registerHeaderChange();
			}
			else {
				scope.unregisterHeaderChange();
			}
		});
	};
}());