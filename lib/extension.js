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
	
	scope.parseTranslation = function parseTranslation(message, parameters = {}){
		const container = document.createDocumentFragment();
		
		message.split(/(\{[^}]+\})/).forEach(function(part){
			if (part.startsWith("{") && part.endsWith("}")){
				part = part.substring(1, part.length - 1);
				const args = part.split(":");
				switch (args[0]){
					case "image": {
						const image = document.createElement("img");
						image.className = "noticeImage";
						image.src = args.slice(1).join(":");
						container.appendChild(image);
						break;
					}
					case "link": {
						const link = document.createElement("a");
						link.target = "_blank";
						link.textContent = args[1];
						link.href = args.slice(2).join(":");
						container.appendChild(link);
						break;
					}
					default:
						if (parameters[args[0]]){
							const parameter = parameters[args[0]];
							if ((typeof parameter) === "function"){
								container.appendChild(parameter(args.slice(1).join(":")));
							}
							else {
								container.appendChild(document.createTextNode(parameter));
							}
						}
						else {
							container.appendChild(document.createTextNode(part));
						}
				}
			}
			else {
				container.appendChild(document.createTextNode(part));
			}
		});
		return container;
	};
	
	scope.getURL = function getURL(str){
		return browser.runtime.getURL(str);
	};
	
	scope.extensionID = browserAvailable? scope.getURL(""): "extensionID";
	
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
		const targetObject = scope.getWrapped(context).Object.create(null);
		const exportedTry = exportFunction(func, targetObject, {allowCrossOriginArguments: true, defineAs: name});
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
	
	const proxies = new Map();
	const changedWindowsForProxies = new WeakMap();
	function setupWindowForProxies(window){
		if (changedWindowsForProxies.get(window)){
			return;
		}
		const wrappedWindow = scope.getWrapped(window);
		
		const functionPrototype = wrappedWindow.Function.prototype;
		const originalToString = functionPrototype.toString;
		changedWindowsForProxies.set(window, originalToString);
		const alteredToString = scope.createProxyFunction(
			window,
			originalToString,
			function toString(){
				if (proxies.has(this)){
					return proxies.get(this).string;
				}
				return originalToString.call(scope.getWrapped(this));
			}
		);
		scope.changeProperty(window, "toString", {
			object: functionPrototype,
			name: "toString",
			type: "value",
			changed: alteredToString
		});
		
		const wrappedReflect = wrappedWindow.Reflect;
		const originalReflectSetPrototypeOf = wrappedReflect.setPrototypeOf;
		const alteredReflectSetPrototypeOf = scope.exportFunctionWithName(
			function setPrototypeOf(target, prototype){
				target = scope.getWrapped(target);
				if (proxies.has(target)){
					target = proxies.get(target).wrappedOriginal;
				}
				if (proxies.has(prototype)){
					prototype = proxies.get(prototype).wrappedOriginal;
				}
				const grandPrototype = wrappedReflect.getPrototypeOf(prototype);
				if (proxies.has(grandPrototype)){
					const testPrototype = wrappedWindow.Object.create(proxies.get(grandPrototype).wrappedOriginal);
					const value = originalReflectSetPrototypeOf.call(wrappedReflect, target, testPrototype);
					if (!value){
						return false;
					}
				}
				const value = originalReflectSetPrototypeOf.call(wrappedReflect, target, scope.getWrapped(prototype));
				return value;
			}, window, "setPrototypeOf"
		);
		scope.changeProperty(window, "toString", {
			object: wrappedWindow.Reflect,
			name: "setPrototypeOf",
			type: "value",
			changed: alteredReflectSetPrototypeOf
		});
	}
	scope.createProxyFunction = function createProxyFunction(window, original, replacement){
		setupWindowForProxies(window);
		const wrappedObject = scope.getWrapped(window).Object;
		const handler = wrappedObject.create(null);
		handler.apply = scope.exportFunctionWithName(function(target, thisArg, args){
			try {
				return args.length?
					replacement.call(thisArg, ...args):
					replacement.call(thisArg);
			}
			catch (error){
				try {
					return original.apply(thisArg, args);
				}
				catch (error){
					return target.apply(thisArg, args);
				}
			}
		}, window, "");
		handler.setPrototypeOf = scope.exportFunctionWithName(function(target, prototype){
			target = scope.getWrapped(target);
			if (proxies.has(target)){
				target = proxies.get(target).wrappedOriginal;
			}
			if (proxies.has(prototype)){
				prototype = proxies.get(prototype).wrappedOriginal;
			}
			const grandPrototype = wrappedObject.getPrototypeOf(prototype);
			if (proxies.has(grandPrototype)){
				const testPrototype = wrappedObject.create(proxies.get(grandPrototype).wrappedOriginal);
				wrappedObject.setPrototypeOf(target, testPrototype);
			}
			return wrappedObject.setPrototypeOf(target, scope.getWrapped(prototype));
		}, window, "");
		const proxy = new window.Proxy(original, handler);
		const proxyData = {
			original: original,
			wrappedOriginal: scope.getWrapped(original),
			string: changedWindowsForProxies.get(window).call(original),
		};
		proxies.set(proxy, proxyData);
		proxies.set(scope.getWrapped(proxy), proxyData);
		return scope.getWrapped(proxy);
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
			const remainingProperties = changedProperties.filter(function(changedProperty){
				return changedProperty.group !== group;
			});
			changedPropertiesByWindow.set(window, remainingProperties);
			changedProperties = changedProperties.filter(function(changedProperty){
				return changedProperty.group === group;
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
	
	scope.waitSync = function waitSync(reason = "for no reason"){
		logging.message(`Starting synchronous request ${reason}.`);
		try {
			let xhr = new XMLHttpRequest();
			xhr.open("GET", "https://[::]", false);
			xhr.send();
			xhr = null;
		}
		catch (error){
			logging.verbose("Error in XHR:", error);
		}
	};
	
	scope.displayVersion = async function displayVersion(node, displayRefresh = false){
		if ("string" === typeof node){
			node = document.getElementById(node);
		}
		if (!node){
			throw "display node not found";
		}
		fetch(scope.getURL("manifest.json")).then(function(response){
			return response.json();
		}).then(function(manifest){
			node.textContent = "Version " + manifest.version;
			return manifest.version;
		}).catch(function(error){
			node.textContent = "Unable to get version: " + error;
		});
		
		if (displayRefresh){
			// Workaround to hide the scroll bars
			window.setTimeout(function(){
				node.style.display = "none";
				node.style.display = "";
			}, displayRefresh);
		}
	};
	
	Object.seal(scope);
}());