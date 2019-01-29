/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* eslint max-lines: off*/
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
				"blockMode": ["ask"]
			}
		},
		{
			"name": "askDenyMode",
			"displayDependencies": {
				"blockMode": ["ask"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "showCanvasWhileAsking",
			"displayDependencies": {
				"blockMode": ["ask"],
				"displayAdvancedSettings": [true]
			}
		},
		"faking",
		{
			"name": "rng",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "storePersistentRnd",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
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
					"blockMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
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
					"blockMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "sharePersistentRndBetweenDomains",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"rng": ["persistent"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		"notifications",
		{
			"name": "showNotifications"
		},
		{
			"name": "highlightPageAction",
			"displayDependencies": [
				{
					"showNotifications": [true]
				}
			]
		},
		{
			"name": "displayBadge"
		},
		{
			"name": "highlightBrowserAction"
		},
		{
			"name": "storeNotificationData",
			"displayDependencies": [
				{
					"showNotifications": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "ignoreList",
			"displayDependencies": [
				{
					"showNotifications": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"displayBadge": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"highlightBrowserAction": ["color", "blink"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "ignoredAPIs",
			"displayDependencies": [
				{
					"showNotifications": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"displayBadge": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"highlightBrowserAction": ["color", "blink"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "showCallingFile",
			"displayDependencies": {
				"blockMode": ["ask"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "showCompleteCallingStack",
			"displayDependencies": [
				{
					"displayAdvancedSettings": [true]
				}
			]
		},
		"lists",
		{
			"name": "enableStackList",
			"displayDependencies": {
				"blockMode": ["fake", "block", "ask"],
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
				"blockMode": ["fake", "block", "ask"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "sessionWhiteList",
			"displayDependencies": {
				"blockMode": ["fake", "block", "ask"],
				"displayAdvancedSettings": [true]
			}
		},
		{
			"name": "blackList",
			"displayDependencies": {
				"blockMode": ["block", "fake", "ask", "allow"],
				"displayAdvancedSettings": [true]
			}
		},
		"Canvas-API",
		{
			"name": "protectedCanvasPart"
		},
		{
			"name": "protectedAPIFeatures",
			"displayedSection": "Canvas-API",
			"displayDependencies": [
				{
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "minFakeSize",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "maxFakeSize",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "ignoreFrequentColors",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"protectedCanvasPart": ["readout", "everything"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "minColors",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"protectedCanvasPart": ["readout", "everything"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "fakeAlphaChannel",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"protectedCanvasPart": ["readout", "everything"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "useCanvasCache",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"protectedCanvasPart": ["readout", "everything"],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "storeImageForInspection",
			"displayDependencies": [
				{
					"showNotifications": [true],
					"storeNotificationData": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		"Audio-API",
		{
			"name": "protectAudio"
		},
		{
			"name": "protectedAPIFeatures",
			"displayedSection": "Audio-API",
			"displayDependencies": [
				{
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "audioFakeRate",
			"displayDependencies": [
				{
					"blockMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
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
					"blockMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
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
					"blockMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
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
					"blockMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"blockMode": ["ask"],
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
					"blockMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				},
				{
					"audioUseFixedIndices": [true],
					"blockMode": ["ask"],
					"askDenyMode": ["fake"],
					"protectAudio": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		"History-API",
		{
			"name": "protectedAPIFeatures",
			"displayedSection": "History-API",
			"displayDependencies": [
				{
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "historyLengthThreshold",
			"displayDependencies": {
				"displayAdvancedSettings": [true]
			}
		},
		"Window-API",
		{
			"name": "protectWindow"
		},
		{
			"name": "protectedAPIFeatures",
			"displayedSection": "Window-API",
			"displayDependencies": [
				{
					"protectWindow": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		"DOMRect-API",
		{
			"name": "protectDOMRect"
		},
		{
			"name": "protectedAPIFeatures",
			"displayedSection": "DOMRect-API",
			"displayDependencies": [
				{
					"protectDOMRect": [true],
					"displayAdvancedSettings": [true]
				}
			]
		},
		{
			"name": "domRectIntegerFactor",
			"displayDependencies": {
				"protectDOMRect": [true],
				"displayAdvancedSettings": [true]
			}
		},
		"misc",
		{
			"name": "theme"
		},
		{
			"name": "blockDataURLs",
			"displayDependencies": {
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
		"settings",
		{
			"name": "openSettingSanitation"
		},
		{
			"name": "exportSettings",
			"actions": ["inspectSettings", "saveSettings", "loadSettings"]
		},
		{
			"name": "resetSettings"
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