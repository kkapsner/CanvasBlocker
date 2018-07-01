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
		"asking",
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
			"name": "showCanvasWhileAsking",
			"displayDependencies": {
				"blockMode": ["askReadout", "ask"],
				"displayAdvancedSettings": [true]
			}
		},
		"faking",
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
			"name": "apiWhiteList",
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
		"notifications",
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
		{
			"name": "ignoreList",
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
		"lists",
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
			"name": "whiteList",
			"displayDependencies": {
				"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "block", "ask"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "blackList",
			"displayDependencies": {
				"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "ask", "allow"],
				"displayAdvancedSettings": [true]
			}
		},
		"Audio-API",
		{
			"name": "protectAudio"
		},
		{
			"name": "audioFakeRate",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask", "allow"],
					"askDenyMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "audioNoiseLevel",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask", "allow"],
					"askDenyMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "useAudioCache",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask", "allow"],
					"askDenyMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "audioUseFixedIndices",
			"displayDependencies": [
				{
					"blockMode": ["fakeReadout", "fakeInput"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["askReadout", "ask", "allow"],
					"askDenyMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "audioFixedIndices",
			"displayDependencies": [
				{
					"audioUseFixedIndices": [true],
					"blockMode": ["fakeReadout", "fakeInput"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"audioUseFixedIndices": [true],
					"blockMode": ["askReadout", "ask", "allow"],
					"askDenyMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		"misc",
		{
			"name": "showReleaseNotes"
		},
		{
			"name": "logLevel",
			"displayDependencies": {
				"displayAdvancedSettings": [true]
			}
		},
		"settings",
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
	settingsDisplay.displayHidden = "displayHiddenSettings";
	
	if ((typeof module) !== "undefined"){
		module.exports = settingsDisplay;
	}
	else {
		window.scope.settingsDisplay = settingsDisplay;
	}
}());