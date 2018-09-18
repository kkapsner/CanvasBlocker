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
		scope = {};
		window.scope.settingStrings = scope;
	}
	
	scope.getMessages = function(settingDefinition){
		const messages = [
			settingDefinition.name + "_title",
			settingDefinition.name + "_description",
		];
		if (settingDefinition.urlSpecific){
			messages.push(settingDefinition.name + "_urlSpecific");
		}
		if (settingDefinition.options){
			settingDefinition.options.forEach(function(option){
				messages.push(settingDefinition.name + "_option." + option);
			});
		}
		return messages;
	};
	
	scope.getStrings = function(settingDefinition){
		const strings = [];
		function addString(string){
			if ((typeof string) === "string" && string.trim()){
				strings.push(string);
			}
		}
		
		addString(settingDefinition.name);
		if (settingDefinition.options){
			settingDefinition.options.forEach(function(option){
				addString(option);
			});
		}
		
		scope.getMessages(settingDefinition).forEach(function(message){
			addString(browser.i18n.getMessage(message));
		});
		
		return strings;
	};
}());