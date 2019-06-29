/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* eslint max-lines: off*/
(function(){
	"use strict";
	var settingsDisplay = [
		{
			name: "general",
			sections: [
				{
					name: "",
					settings: [
						{
							"name": "displayAdvancedSettings"
						},
						{
							"name": "blockMode"
						},
					]
				},
				{
					name: "asking",
					settings: [
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
					]
				},
				{
					name: "faking",
					settings: [
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
							"actions": ["clearPersistentRnd", "clearPersistentRndForContainer"],
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
					]
				},
				{
					name: "notifications",
					settings: [
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
							"multiline": true,
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
					]
				},
				{
					name: "lists",
					settings: [
						{
							"name": "enableStackList",
							"displayDependencies": {
								"blockMode": ["fake", "block", "ask"],
								"displayAdvancedSettings": [true]
							}
						},
						{
							"name": "stackList",
							"multiline": true,
							"displayDependencies": {
								"enableStackList": [true],
								"displayAdvancedSettings": [true]
							}
							
						},
						{
							"name": "whiteList",
							"multiline": true,
							"displayDependencies": {
								"blockMode": ["fake", "block", "ask"],
								"displayAdvancedSettings": [true]
							}
						},
						{
							"name": "sessionWhiteList",
							"multiline": true,
							"displayDependencies": {
								"blockMode": ["fake", "block", "ask"],
								"displayAdvancedSettings": [true]
							}
						},
						{
							"name": "blackList",
							"multiline": true,
							"displayDependencies": {
								"blockMode": ["block", "fake", "ask", "allow"],
								"displayAdvancedSettings": [true]
							}
						},
					]
				},
			]
		},
		{
			name: "APIs",
			sections: [
				{
					name: "Canvas-API",
					settings: [
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
					]
				},
				{
					name: "Audio-API",
					settings: [
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
					]
				},
				{
					name: "History-API",
					settings: [
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
					]
				},
				{
					name: "Window-API",
					settings: [
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
					]
				},
				{
					name: "DOMRect-API",
					settings: [
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
					]
				},
				{
					name: "Navigator-API",
					settings: [
						{
							"name": "protectNavigator"
						},
						{
							"name": "protectedAPIFeatures",
							"displayedSection": "Navigator-API",
							"displayDependencies": [
								{
									"protectNavigator": [true],
									"displayAdvancedSettings": [true]
								}
							]
						},
						{
							"name": "openNavigatorSettings",
							"displayDependencies": [
								{
									"protectNavigator": [true]
								}
							]
						},
					]
				},
			]
		},
		{
			name: "misc",
			sections: [
				{
					name: "misc",
					settings: [
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
					]
				},
				{
					name: "settings",
					settings: [
						{
							"name": "displayDescriptions"
						},
						{
							"name": "openSettingSanitation"
						},
						{
							"name": "exportSettings",
							"actions": ["inspectSettings", "inspectWhitelist", "saveSettings", "loadSettings"]
						},
						{
							"name": "resetSettings"
						}
					]
				}
			]
		}
	];
	settingsDisplay.displayHidden = "displayHiddenSettings";
	
	if ((typeof module) !== "undefined"){
		module.exports = settingsDisplay;
	}
	else {
		require.register("./settingsDisplay", settingsDisplay);
	}
}());