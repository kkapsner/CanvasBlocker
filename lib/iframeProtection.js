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
	const {getWrapped} = require("./modifiedAPIFunctions");
	
	scope.protect = function protect(window, wrappedWindow, singleCallback, allCallback){
		

		[window.HTMLIFrameElement, window.HTMLFrameElement].forEach(function(constructor){
			var oldContentWindowGetter = constructor.prototype.__lookupGetter__("contentWindow");
			Object.defineProperty(
				getWrapped(constructor.prototype),
				"contentWindow",
				{
					enumerable: true,
					configurable: true,
					get: exportFunction(function(){
						var window = oldContentWindowGetter.call(this);
						if (window){
							singleCallback(window);
						}
						return window;
					}, window)
				}
			);
			var oldContentDocumentGetter = constructor.prototype.__lookupGetter__("contentDocument");
			Object.defineProperty(
				getWrapped(constructor.prototype),
				"contentDocument",
				{
					enumerable: true,
					configurable: true,
					get: exportFunction(function(){
						var document = oldContentDocumentGetter.call(this);
						if (document){
							singleCallback(document.defaultView);
						}
						return document;
					}, window)
				}
			);
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
				setters: ["innerHTML", "outerHTML"]
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
			});
			protectionDefinition.getters.forEach(function(property){
				const descriptor = Object.getOwnPropertyDescriptor(object, property);
				const temp = eval(`({
					get ${property}(){
						const ret = this.${property};
						allCallback();
						return ret;
					}
				})`);
				descriptor.get = exportFunction(Object.getOwnPropertyDescriptor(temp, property).get, window);
				Object.defineProperty(object, property, descriptor);
			});
			protectionDefinition.setters.forEach(function(property){
				const descriptor = Object.getOwnPropertyDescriptor(object, property);
				const temp = eval(`({
					set ${property}(value){
						const ret = this.${property} = value;
						allCallback();
						return ret;
					}
				})`);
				descriptor.set = exportFunction(Object.getOwnPropertyDescriptor(temp, property).set, window);
				Object.defineProperty(object, property, descriptor);
			});
		});
		
		// MutationObserver to intercept iframes while generating the DOM.
		var observer = new MutationObserver(allCallback);
		observer.observe(window.document.documentElement, {subtree: true, childList: true});
		window.document.addEventListener("DOMContentLoaded", function(){
			observer.disconnect();
		});
		
		// MutationObserver does not trigger fast enough when document.write is used
		const documentWriteDescriptor = Object.getOwnPropertyDescriptor(wrappedWindow.HTMLDocument.prototype, "write");
		const documentWrite = documentWriteDescriptor.value;
		documentWriteDescriptor.value = exportFunction(function write(str){
			const parts = str.split(/(?=>)/);
			const length = parts.length;
			for (let i = 0; i < length; i += 1){
				documentWrite.call(this, parts[i]);
				allCallback();
			}
		}, window);
		Object.defineProperty(wrappedWindow.HTMLDocument.prototype, "write", documentWriteDescriptor);
		
		const documentWritelnDescriptor = Object.getOwnPropertyDescriptor(wrappedWindow.HTMLDocument.prototype, "writeln");
		const documentWriteln = documentWritelnDescriptor.value;
		documentWritelnDescriptor.value = exportFunction(function writeln(str){
			const parts = str.split(/(?=>)/);
			const length = parts.length - 1;
			for (let i = 0; i < length; i += 1){
				documentWrite.call(this, parts[i]);
				allCallback();
			}
			documentWriteln.call(this, parts[length]);
		}, window);
		Object.defineProperty(wrappedWindow.HTMLDocument.prototype, "writeln", documentWritelnDescriptor);
	};
}());