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
			"name": "displayDescriptions"
		},
		{
			"name": "blockMode"
		},
		// {
		// 	"name": "whiteList",
		// 	"displayDependencies": {
		// 		"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "block", "ask"]
		// 	}
		// },
		// {
		// 	"name": "blackList",
		// 	"displayDependencies": {
		// 		"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "ask", "allow"]
		// 	}
		// },
		{
			"name": "askOnlyOnce",
			"displayDependencies": {
				"blockMode": ["askReadout", "ask"]
			}
		},
		{
			"name": "askDenyMode",
			"displayDependencies": {
				"blockMode": ["askReadout", "ask"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "minFakeSize",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "maxFakeSize",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "rng",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "storePersistentRnd",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "persistentRndClearInterval",
			"inputs": ["persistentRndClearIntervalValue", "persistentRndClearIntervalUnit"],
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "clearPersistentRnd",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "ignoreFrequentColors",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "minColors",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "fakeAlphaChannel",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "useCanvasCache",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "showNotifications",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"]
				}
			]
		},
		{
			"name": "storeImageForInspection",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"showNotifications": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask"],
					"askDenyMode": ["fake"],
					"showNotifications": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		// {
		// 	"name": "ignoreList",
		// 	"displayDependencies": [
		// 		{
		// 			"blockMode": ["fakeReadout", "fakeInput"],
		// 			"showNotifications": [true]
		// 		},
		// 		{
		// 			"blockMode": ["askReadout", "ask"],
		// 			"askDenyMode": ["fake"],
		// 			"showNotifications": [true]
		// 		}
		// 	]
		// },
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
		},
		{
			"name": "exportSettings",
			"displayDependencies": {
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "resetSettings",
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