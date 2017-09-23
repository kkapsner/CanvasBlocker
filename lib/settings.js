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
		window.scope.settings = {};
		scope = window.scope.settings;
	}

	var settingDefinitions = [
		{
			name: "logLevel",
			defaultValue: 1
		},
		{
			name: "whiteList",
			defaultValue: ""
		},
		{
			name: "blackList",
			defaultValue: ""
		},
		{
			name: "blockMode",
			defaultValue: "fakeReadout",
			options: ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "blockEverything", "block", "ask", "allow", "allowEverything"]
		},
		{
			name: "minFakeSize",
			defaultValue: 1
		},
		{
			name: "maxFakeSize",
			defaultValue: 0
		},
		{
			name: "rng",
			defaultValue: "nonPersistent",
			options: ["nonPersistent", "constant", "persistent"]
		},
		{
			name: "useCanvasCache",
			defaultValue: true
		},
		{
			name: "ignoreFrequentColors",
			defaultValue: 0
		},
		{
			name: "fakeAlphaChannel",
			defaultValue: false
		},
		{
			name: "persistentRndStorage",
			defaultValue: ""
		},
		{
			name: "storePersistentRnd",
			defaultValue: false
		},
		{
			name: "askOnlyOnce",
			defaultValue: true
		},
		{
			name: "showNotifications",
			defaultValue: true
		},
		{
			name: "storeImageForInspection",
			defaultValue: false
		},
		{
			name: "notificationDisplayTime",
			defaultValue: 30
		},
		{
			name: "ignoreList",
			defaultValue: ""
		},
		{
			name: "showCallingFile",
			defaultValue: false
		},
		{
			name: "showCompleteCallingStack",
			defaultValue: false
		},
		{
			name: "enableStackList",
			defaultValue: false
		},
		{
			name: "stackList",
			defaultValue: ""
		},
		{
			name: "displayAdvancedSettings",
			defaultValue: false
		},
		{
			name: "isStillDefault",
			defaultValue: true
		}
	];

	var settings = {};
	window.settings = {};

	settingDefinitions.forEach(function(settingDefinition){
		var name = settingDefinition.name;
		settings[name] = settingDefinition.defaultValue;
		Object.defineProperty(
			window.settings,
			{
				name: name,
				get: function(){
					return settings[name]
				},
				set: function(newValue){
					if ((typeof newValue) === (typeof settingDefinition.defaultValue)){
						if (
							!settingDefinition.options ||
							settingDefinition.options.includes(newValue)
						){
							settings[name] = newValue;
							
						}
					}
				}
			}
		);
	});

	scope.forEach = function forEachSetting(...args){
		settingDefinitions.map(function(settingDefinition){
			return Object.create(settingDefinition);
		}).forEach(...args);
	}
}());