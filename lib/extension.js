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
		scope = require.register("./extension", {});
	}
	
	const browserAvailable = typeof browser !== "undefined";
	const logging = require("./logging");
	
	scope.inBackgroundScript = !!(
		browserAvailable &&
		browser.extension.getBackgroundPage &&
		browser.extension.getBackgroundPage() === window
	);
	
	scope.getTranslation = browserAvailable? function getTranslation(id){
		return browser.i18n.getMessage(id);
	}: function(id){
		return id;
	};
	
	scope.extensionID = browserAvailable? browser.extension.getURL(""): "extensionID";
	
	scope.inIncognitoContext = browserAvailable? browser.extension.inIncognitoContext: false;
	
	scope.message = {
		on: browserAvailable? function(callback){
			return browser.runtime.onMessage.addListener(callback);
		}: function(){
			return false;
		},
		send: browserAvailable? function(data){
			return browser.runtime.sendMessage(data);
		}: function(){
			return false;
		}
	};
	Object.seal(scope.message);
	
	scope.getWrapped = function getWrapped(obj){
		return obj && (obj.wrappedJSObject || obj);
	};
	
	scope.exportFunctionWithName = function exportFunctionWithName(func, context, name){
		const exportedTry = exportFunction(func, context, {allowCrossOriginArguments: true});
		if (exportedTry.name === name){
			return exportedTry;
		}
		else {
			if (func.name === name){
				logging.message(
					"FireFox bug: Need to change name in exportFunction from",
					exportedTry.name,
					"(originally correct) to",
					name
				);
			}
			else {
				logging.error("Wrong name specified for", name, new Error());
			}
			const wrappedContext = scope.getWrapped(context);
			const options = {
				allowCrossOriginArguments: true,
				defineAs: name
			};
			const oldDescriptor = Object.getOwnPropertyDescriptor(wrappedContext, name);
			if (oldDescriptor && !oldDescriptor.configurable){
				logging.error(
					"Unable to export function with the correct name", name,
					"instead we have to use", exportedTry.name
				);
				return exportedTry;
			}
			const exported = exportFunction(func, context, options);
			if (oldDescriptor){
				Object.defineProperty(wrappedContext, name, oldDescriptor);
			}
			else {
				delete wrappedContext[name];
			}
			return exported;
		}
	};
	
	const changedPropertiesByWindow = new WeakMap();
	scope.changeProperty = function(window, group, {object, name, type, changed}){
		let changedProperties = changedPropertiesByWindow.get(scope.getWrapped(window));
		if (!changedProperties){
			changedProperties = [];
			changedPropertiesByWindow.set(scope.getWrapped(window), changedProperties);
		}
		const descriptor = Object.getOwnPropertyDescriptor(object, name);
		const original = descriptor[type];
		descriptor[type] = changed;
		Object.defineProperty(object, name, descriptor);
		changedProperties.push({group, object, name, type, original});
	};
	scope.revertProperties = function(window, group){
		window = scope.getWrapped(window);
		let changedProperties = changedPropertiesByWindow.get(window);
		if (!changedProperties){
			return;
		}
		if (group){
			const remainingProperties = changedProperties.filter(function({group}){
				return group !== group;
			});
			changedPropertiesByWindow.set(window, remainingProperties);
			changedProperties = changedProperties.filter(function({group}){
				return group === group;
			});
		}
		else {
			changedPropertiesByWindow.delete(window);
		}
		
		for (let i = changedProperties.length - 1; i >= 0; i -= 1){
			const {object, name, type, original} = changedProperties[i];
			logging.verbose("reverting", name, "on", object);
			const descriptor = Object.getOwnPropertyDescriptor(object, name);
			descriptor[type] = original;
			Object.defineProperty(object, name, descriptor);
		}
	};
	
	Object.seal(scope);
}());