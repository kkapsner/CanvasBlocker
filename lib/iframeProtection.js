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
	const extension = require("./extension");
	const lists = require("./lists");
	
	function isWhitelisted(url){
		return lists.get("white").match(url) || settings.get("blockMode", url).startsWith("allow");
	}
	
	function createChangeProperty(window){
		function changeProperty(object, name, type, changed){
			const descriptor = Object.getOwnPropertyDescriptor(object, name);
			const original = descriptor[type];
			if ((typeof changed) === "function"){
				changed = extension.createProxyFunction(window, original, changed);
			}
			extension.changeProperty(window, "iframeProtection", {object, name, type, changed});
		}
		if (settings.isStillDefault){
			settings.onloaded(function(){
				if (isWhitelisted(window.location)){
					extension.revertProperties(window, "iframeProtection");
				}
			});
		}
		else {
			if (isWhitelisted(window.location)){
				return false;
			}
		}
		window.addEventListener("unload", function(){
			extension.revertProperties(window, "iframeProtection");
		});
		return changeProperty;
	}
	
	function protectFrameProperties({window, wrappedWindow, changeProperty, singleCallback}){
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
					const window = originalContentWindowGetter.call(this);
					if (window){
						singleCallback(window);
					}
					return window;
				}
			};
			changeProperty(wrappedConstructor.prototype, "contentWindow", "get",
				Object.getOwnPropertyDescriptor(contentWindowTemp, "contentWindow").get
			);
			
			const contentDocumentDescriptor = Object.getOwnPropertyDescriptor(
				constructor.prototype,
				"contentDocument"
			);
			const originalContentDocumentGetter = contentDocumentDescriptor.get;
			const contentDocumentTemp = {
				get contentDocument(){
					const document = originalContentDocumentGetter.call(this);
					if (document){
						singleCallback(document.defaultView);
					}
					return document;
				}
			};
			changeProperty(wrappedConstructor.prototype, "contentDocument", "get",
				Object.getOwnPropertyDescriptor(contentDocumentTemp, "contentDocument").get
			);
		});
	}
	
	function protectDOMModifications({window, wrappedWindow, changeProperty, allCallback}){
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
				changeProperty(object, method, "value", class {
					[method](){
						const value = arguments.length?
							original.call(this, ...arguments):
							original.call(this);
						allCallback();
						return value;
					}
				}.prototype[method]);
			});
			protectionDefinition.getters.forEach(function(property){
				const temp = {
					get [property](){
						const ret = this[property];
						allCallback();
						return ret;
					}
				};
				changeProperty(object, property, "get",
					Object.getOwnPropertyDescriptor(temp, property).get
				);
			});
			protectionDefinition.setters.forEach(function(property){
				const descriptor = Object.getOwnPropertyDescriptor(object, property);
				const setter = descriptor.set;
				const temp = {
					set [property](value){
						const ret = setter.call(this, value);
						// const ret = this.${property} = value;
						allCallback();
						return ret;
					}
				};
				changeProperty(object, property, "set",
					Object.getOwnPropertyDescriptor(temp, property).set
				);
			});
		});
	}
	
	function enableMutationObserver({window, allCallback}){
		const observer = new MutationObserver(allCallback);
		let observing = false;
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
	}
	
	function protectDocumentWrite({window, wrappedWindow, changeProperty, observe, allCallback}){
		const documentWriteDescriptorOnHTMLDocument = Object.getOwnPropertyDescriptor(
			wrappedWindow.HTMLDocument.prototype,
			"write"
		);
		const documentWriteDescriptor = documentWriteDescriptorOnHTMLDocument || Object.getOwnPropertyDescriptor(
			wrappedWindow.Document.prototype,
			"write"
		);
		const documentWrite = documentWriteDescriptor.value;
		changeProperty(
			documentWriteDescriptorOnHTMLDocument?
				wrappedWindow.HTMLDocument.prototype:
				wrappedWindow.Document.prototype,
			"write", "value", function write(markup){
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
			}
		);
		
		const documentWritelnDescriptorOnHTMLDocument = Object.getOwnPropertyDescriptor(
			wrappedWindow.HTMLDocument.prototype,
			"writeln"
		);
		const documentWritelnDescriptor = documentWritelnDescriptorOnHTMLDocument || Object.getOwnPropertyDescriptor(
			wrappedWindow.Document.prototype,
			"writeln"
		);
		const documentWriteln = documentWritelnDescriptor.value;
		changeProperty(
			documentWritelnDescriptorOnHTMLDocument?
				wrappedWindow.HTMLDocument.prototype:
				wrappedWindow.Document.prototype,
			"writeln", "value", function writeln(markup){
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
			}
		);
	}
	
	function protectWindowOpen({window, wrappedWindow, changeProperty, singleCallback}){
		const windowOpenDescriptor = Object.getOwnPropertyDescriptor(
			wrappedWindow,
			"open"
		);
		const windowOpen = windowOpenDescriptor.value;
		const getDocument = Object.getOwnPropertyDescriptor(
			window,
			"document"
		).get;
		changeProperty(
			wrappedWindow,
			"open", "value", function open(){
				const newWindow = arguments.length?
					windowOpen.call(this, ...arguments):
					windowOpen.call(this);
				if (newWindow){
					// if we use windowOpen from the normal window we see some SOP errors
					// BUT we need the unwrapped window...
					singleCallback(getDocument.call(newWindow).defaultView);
				}
				return newWindow;
			}
		);
	}
	
	scope.protect = function protect(window, wrappedWindow, singleCallback, allCallback){
		const changeProperty = createChangeProperty(window);
		
		if (!changeProperty){
			return;
		}
		
		const api = {window, wrappedWindow, changeProperty, singleCallback, allCallback};
		
		protectFrameProperties(api);
		
		protectDOMModifications(api);
		
		// MutationObserver to intercept iFrames while generating the DOM.
		api.observe = enableMutationObserver(api);
		
		// MutationObserver does not trigger fast enough when document.write is used
		protectDocumentWrite(api);
		
		protectWindowOpen(api);
	};
}());