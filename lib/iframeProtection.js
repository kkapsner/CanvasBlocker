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
		scope = require.register("./iframeProtection", {});
	}
	
	const settings = require("./settings");
	const lists = require("./lists");
	
	function isWhitelisted(url){
		return lists.get("white").match(url) || settings.get("blockMode", url).startsWith("allow");
	}
	
	scope.protect = function protect(window, wrappedWindow, singleCallback, allCallback){
		
		const changedProperties = [];
		// eslint-disable-next-line max-params
		function registerChangedProperty(object, name, descriptor, type, original){
			changedProperties.push({object, name, descriptor, type, original});
		}
		if (settings.isStillDefault){
			settings.onloaded(function(){
				if (isWhitelisted(window.location)){
					changedProperties.forEach(function({object, name, descriptor, type, original}){
						descriptor[type] = original;
						Object.defineProperty(object, name, descriptor);
					});
					changedProperties.length = 0;
				}
			});
		}
		else {
			if (isWhitelisted(window.location)){
				return;
			}
		}
		
		["HTMLIFrameElement", "HTMLFrameElement"].forEach(function(constructorName){
			const constructor = window[constructorName];
			const wrappedConstructor = wrappedWindow[constructorName];
			
			const contentWindowDescriptor = Object.getOwnPropertyDescriptor(
				constructor.prototype,
				"contentWindow"
			);
			const originalContentWindowGetter = contentWindowDescriptor.get;
			const contentWindowTemp = {
				get contentWindow(){
					var window = originalContentWindowGetter.call(this);
					if (window){
						singleCallback(window);
					}
					return window;
				}
			};
			contentWindowDescriptor.get = exportFunction(
				Object.getOwnPropertyDescriptor(contentWindowTemp, "contentWindow").get,
				window
			);
			Object.defineProperty(wrappedConstructor.prototype, "contentWindow", contentWindowDescriptor);
			registerChangedProperty(wrappedConstructor.prototype, "contentWindow", contentWindowDescriptor,
				"get", originalContentWindowGetter);
			
			const contentDocumentDescriptor = Object.getOwnPropertyDescriptor(
				constructor.prototype,
				"contentDocument"
			);
			const originalContentDocumentGetter = contentDocumentDescriptor.get;
			const contentDocumentTemp = {
				get contentDocument(){
					var document = originalContentDocumentGetter.call(this);
					if (document){
						singleCallback(document.defaultView);
					}
					return document;
				}
			};
			contentDocumentDescriptor.get = exportFunction(
				Object.getOwnPropertyDescriptor(contentDocumentTemp, "contentDocument").get,
				window
			);
			Object.defineProperty(wrappedConstructor.prototype, "contentDocument", contentDocumentDescriptor);
			registerChangedProperty(wrappedConstructor.prototype, "contentDocument", contentDocumentDescriptor,
				"get", originalContentDocumentGetter);
		});
		[
			// useless as length could be obtained before the iframe is created and window.frames === window
			// {
			// 	object: wrappedWindow,
			// 	methods: [],
			// 	getters: ["length", "frames"],
			// 	setters: []
			// },
			{
				object: wrappedWindow.Node.prototype,
				methods: ["appendChild", "insertBefore", "replaceChild"],
				getters: [],
				setters: []
			},
			{
				object: wrappedWindow.Element.prototype,
				methods: [
					"append", "prepend",
					"insertAdjacentElement", "insertAdjacentHTML", "insertAdjacentText",
					"replaceWith"
				],
				getters: [],
				setters: [
					"innerHTML",
					"outerHTML"
				]
			}
		].forEach(function(protectionDefinition){
			const object = protectionDefinition.object;
			protectionDefinition.methods.forEach(function(method){
				const descriptor = Object.getOwnPropertyDescriptor(object, method);
				const original = descriptor.value;
				descriptor.value = exportFunction(eval(`(function ${method}(){
					const value = arguments.length?
						original.apply(this, window.Array.from(arguments)):
						original.call(this);
					allCallback();
					return value;
				})`), window);
				Object.defineProperty(object, method, descriptor);
				registerChangedProperty(object, method, descriptor, "value", original);
			});
			protectionDefinition.getters.forEach(function(property){
				const descriptor = Object.getOwnPropertyDescriptor(object, property);
				const getter = descriptor.get;
				const temp = eval(`({
					get ${property}(){
						const ret = this.${property};
						allCallback();
						return ret;
					}
				})`);
				descriptor.get = exportFunction(Object.getOwnPropertyDescriptor(temp, property).get, window);
				Object.defineProperty(object, property, descriptor);
				registerChangedProperty(object, property, descriptor, "get", getter);
			});
			protectionDefinition.setters.forEach(function(property){
				const descriptor = Object.getOwnPropertyDescriptor(object, property);
				const setter = descriptor.set;
				const temp = eval(`({
					set ${property}(value){
						const ret = setter.call(this, value);
						// const ret = this.${property} = value;
						allCallback();
						return ret;
					}
				})`);
				descriptor.set = exportFunction(Object.getOwnPropertyDescriptor(temp, property).set, window);
				Object.defineProperty(object, property, descriptor);
				registerChangedProperty(object, property, descriptor, "set", setter);
			});
		});
		
		// MutationObserver to intercept iFrames while generating the DOM.
		const observe = function(){
			var observer = new MutationObserver(allCallback);
			var observing = false;
			function observe(){
				if (
					!observing &&
					window.document
				){
					observer.observe(window.document, {subtree: true, childList: true});
					observing = true;
				}
			}
			observe();
			window.document.addEventListener("DOMContentLoaded", function(){
				if (observing){
					observer.disconnect();
					observing = false;
				}
			});
			return observe;
		}();
		
		// MutationObserver does not trigger fast enough when document.write is used
		const documentWriteDescriptor = Object.getOwnPropertyDescriptor(
			wrappedWindow.HTMLDocument.prototype,
			"write"
		) || Object.getOwnPropertyDescriptor(
			wrappedWindow.Document.prototype,
			"write"
		);
		const documentWrite = documentWriteDescriptor.value;
		documentWriteDescriptor.value = exportFunction(function write(markup){
			for (let i = 0, l = arguments.length; i < l; i += 1){
				const str = "" + arguments[i];
				// weird problem with waterfox and google docs
				const parts = (
					str.match(/^\s*<!doctype/i) &&
					!str.match(/frame/i)
				)? [str]: str.split(/(?=<)/);
				const length = parts.length;
				const scripts = window.document.getElementsByTagName("script");
				for (let i = 0; i < length; i += 1){
					documentWrite.call(this, parts[i]);
					allCallback();
					if (scripts.length && scripts[scripts.length - 1].src){
						observe();
					}
				}
			}
		}, window);
		Object.defineProperty(wrappedWindow.HTMLDocument.prototype, "write", documentWriteDescriptor);
		registerChangedProperty(wrappedWindow.HTMLDocument.prototype, "write", documentWriteDescriptor,
			"value", documentWrite);
		
		const documentWritelnDescriptor = Object.getOwnPropertyDescriptor(
			wrappedWindow.HTMLDocument.prototype,
			"writeln"
		) || Object.getOwnPropertyDescriptor(
			wrappedWindow.Document.prototype,
			"writeln"
		);
		const documentWriteln = documentWritelnDescriptor.value;
		documentWritelnDescriptor.value = exportFunction(function writeln(markup){
			for (let i = 0, l = arguments.length; i < l; i += 1){
				const str = "" + arguments[i];
				const parts = str.split(/(?=<)/);
				const length = parts.length;
				const scripts = window.document.getElementsByTagName("script");
				for (let i = 0; i < length; i += 1){
					documentWrite.call(this, parts[i]);
					allCallback();
					if (scripts.length && scripts[scripts.length - 1].src){
						observe();
					}
				}
			}
			documentWriteln.call(this, "");
		}, window);
		Object.defineProperty(wrappedWindow.HTMLDocument.prototype, "writeln", documentWritelnDescriptor);
		registerChangedProperty(wrappedWindow.HTMLDocument.prototype, "writeln", documentWritelnDescriptor,
			"value", documentWriteln);
	};
}());