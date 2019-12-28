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
		scope = require.register("./settingStrings", {});
	}
	
	const extension = require("./extension");
	
	scope.getMessages = function(settingDefinition){
		const messages = [];
		if (!settingDefinition){
			return messages;
		}
		
		messages.push(settingDefinition.name + "_title");
		messages.push(settingDefinition.name + "_description");
		if (settingDefinition.urlSpecific){
			messages.push(settingDefinition.name + "_urlSpecific");
		}
		if (settingDefinition.options){
			settingDefinition.options.forEach(function(option){
				if (option !== null){
					messages.push(settingDefinition.name + "_options." + option);
				}
			});
		}
		if (settingDefinition.inputs){
			settingDefinition.inputs.forEach(function(input){
				if (input && input.options){
					input.options.forEach(function(option){
						if (option !== null){
							messages.push(input.name + "_options." + option);
						}
					});
				}
			});
		}
		if (settingDefinition.action){
			messages.push(settingDefinition.name + "_label");
		}
		if (settingDefinition.actions){
			settingDefinition.actions.forEach(function(action){
				messages.push(action.name + "_label");
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
			addString(extension.getTranslation(message));
		});
		
		return strings;
	};
}());