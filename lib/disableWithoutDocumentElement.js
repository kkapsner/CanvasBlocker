/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	 "use strict";
	
	const observers = require("sdk/system/events");
	const { when: unload } = require("sdk/system/unload");
	
	var classes = {
		HTMLCanvasElement: ["getContext", "toDataURL", "toBlob", "mozGetAsFile"],
		CanvasRenderingContext2D: ["getImageData"],
		WebGLRenderingContext: ["readPixels"]
	};
	
	var classNames = Object.keys(classes);
	
	var originalProperties = new WeakMap();
	
	function disable({subject: window}){
		var oldProperties = {};
		classNames.forEach(function(className){
			oldProperties[className] = {};
			classes[className].forEach(function(funcName){
				oldProperties[className][funcName] = window.wrappedJSObject[className].prototype[funcName];
				window.wrappedJSObject[className].prototype[funcName] = function(){};
			});
		});
		originalProperties.set(window, oldProperties);
	}
	
	function reset({subject: document}){
		var window = document.defaultView;
		var oldProperties = originalProperties.get(window);
		if (oldProperties){
			originalProperties.delete(window);
			classNames.forEach(function(className){
				classes[className].forEach(function(funcName){
					window.wrappedJSObject[className].prototype[funcName] = oldProperties[className][funcName];
				});
			});
		}
	}
	
	observers.on("content-document-global-created", disable);
	unload(() => observers.off("content-document-global-created", disable));
	observers.on("document-element-inserted", reset);
	unload(() => observers.off("document-element-inserted", reset));
}());