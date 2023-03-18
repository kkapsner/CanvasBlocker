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
	original["real Firefox version - rv"] = window.navigator.userAgent.replace(/^.+; rv:([\d.]+).*$/, "$1");
	
	let changedValues = {};
	
	settings.onloaded(function(){
		changedValues = settings.navigatorDetails;
	});
	settings.on("navigatorDetails", function({newValue}){
		changedValues = newValue;
	});
	
	const getValue = function(){
		function getChangedValues(getCookieStoreId){
			if (changedValues.contextualIdentities){
				const cookieStoreId = getCookieStoreId();
				if (
					cookieStoreId !== "" &&
					cookieStoreId !== "firefox-default" &&
					changedValues.contextualIdentities[cookieStoreId]
				){
					return changedValues.contextualIdentities[cookieStoreId];
				}
				else {
					return changedValues;
				}
			}
			else {
				return changedValues;
			}
		}
		
		return function getValue(name, getCookieStoreId){
			const changedValues = getChangedValues(getCookieStoreId);
			
			function getValueInternal(name, stack = []){
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
				if (string === "{undefined}"){
					return undefined;
				}
				return string.replace(/{([a-z[\]_. -]*)}/ig, function(m, name){
					return getValueInternal(name, stack.slice());
				});
			}
			return getValueInternal(name);
		};
	}();
	
	scope.getNavigatorValue = function getNavigatorValue(name, getCookieStoreId){
		return getValue(name, getCookieStoreId);
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
					header.value = getValue("userAgent", function(){
						return details.cookieStoreId;
					});
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
		
		if (browser.contextualIdentities && browser.contextualIdentities.onRemoved){
			logging.message("register contextual navigator identities removal");
			browser.contextualIdentities.onRemoved.addListener(function(details){
				logging.message("Contextual navigator identity", details.contextualIdentity.cookieStoreId, "removed.");
				if (changedValues.contextualIdentities){
					delete changedValues.contextualIdentities[details.contextualIdentity.cookieStoreId];
					if (Object.keys(changedValues.contextualIdentities).length === 0){
						delete changedValues.contextualIdentities;
					}
					settings.navigatorDetails = changedValues;
				}
			});
		}
		else {
			logging.error(
				"Old Firefox does not support browser.contextualIdentities.onRemoved"
			);
		}
	};
}());