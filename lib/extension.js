/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./extension", {});
	}
	
	const browserAvailable = typeof browser !== "undefined";
	
	scope.inBackgroundScript = !!(
		browserAvailable &&
		browser.extension.getBackgroundPage &&
		browser.extension.getBackgroundPage() === window
	);
	
	scope.getTranslation = function getTranslation(id){
		return browser.i18n.getMessage(id);
	};
	
	scope.extensionID = browser.extension.getURL("");
	
	scope.inIncognitoContext = browser.extension.inIncognitoContext;
	
	scope.message = {
		on: function(callback){
			return browser.runtime.onMessage.addListener(callback);
		},
		send: function(data){
			return browser.runtime.sendMessage(data);
		}
	};
	Object.seal(scope.message);
	
	Object.seal(scope);
}());