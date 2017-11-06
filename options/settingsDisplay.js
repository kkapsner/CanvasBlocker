/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	var settingsDisplay = [
		{
			"name": "displayAdvancedSettings"
		},
		{
			"name": "blockMode"
		},
		{
			"name": "whiteList",
			"displayDependencies": {
				"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "block", "ask"]
			}
		},
		{
			"name": "blackList",
			"displayDependencies": {
				"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "ask", "allow"]
			}
		},
		{
			"name": "minFakeSize",
			"displayDependencies": {
				"blockMode": ["fakeReadout", "fakeInput"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "maxFakeSize",
			"displayDependencies": {
				"blockMode": ["fakeReadout", "fakeInput"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "rng",
			"displayDependencies": {
				"blockMode": ["fakeReadout", "fakeInput"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "storePersistentRnd",
			"displayDependencies": {
				"blockMode": ["fakeReadout", "fakeInput"],
				"rng": ["persistent"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "clearPersistentRnd",
			"displayDependencies": {
				"blockMode": ["fakeReadout", "fakeInput"],
				"rng": ["persistent"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "ignoreFrequentColors",
			"displayDependencies": {
				"blockMode": ["fakeReadout"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "fakeAlphaChannel",
			"displayDependencies": {
				"blockMode": ["fakeReadout"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "useCanvasCache",
			"displayDependencies": {
				"blockMode": ["fakeReadout"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "askOnlyOnce",
			"displayDependencies": {
				"blockMode": ["askReadout", "ask"]
			}
		},
		{
			"name": "showNotifications",
			"displayDependencies": {
				"blockMode": ["fakeReadout", "fakeInput"]
			}
		},
		{
			"name": "storeImageForInspection",
			"displayDependencies": {
				"blockMode": ["fakeReadout", "fakeInput"],
				"showNotifications": [true],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "ignoreList",
			"displayDependencies": {
				"blockMode": ["fakeReadout", "fakeInput"],
				"showNotifications": [true]
			}
		},
		{
			"name": "showCallingFile",
			"displayDependencies": {
				"blockMode": ["askReadout", "ask"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "showCompleteCallingStack",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"showNotifications": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "enableStackList",
			"displayDependencies": {
				"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "block", "ask"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "stackList",
			"displayDependencies": {
				"enableStackList": [true],
				"displayAdvancedSettings": [true]
			}
			
		},
		{
			"name": "showReleaseNotes"
		},
		{
			"name": "logLevel",
			"displayDependencies": {
				"displayAdvancedSettings": [true]
			}
		}
	];
	
	if ((typeof module) !== "undefined"){
		module.exports = settingsDisplay;
	}
	else {
		window.scope.settingsDisplay = settingsDisplay;
	}
}());