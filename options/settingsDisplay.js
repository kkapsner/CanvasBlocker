/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	const settingsDisplay = [
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
						{
							"name": "disruptSessionOnUpdate"
						},
						{
							"name": "reloadExtension",
							"actions": ["reloadExtension"],
							"displayDependencies": [{"updatePending": [true]}]
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
							"actions": [
								"clearPersistentRnd",
								function(){
									try {
										return browser.contextualIdentities? "clearPersistentRndForContainer": false;
									}
									catch (error){
										return false;
									}
								}()
							],
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
				{
					name: "settings",
					settings: [
						{
							"name": "displayDescriptions"
						},
						{
							"name": "settingControlling",
							"actions": [
								"openSettingSanitation",
								"inspectWhitelist"
							]
						},
						{
							"name": "openSettingPresets"
						},
						{
							"name": "exportSettings",
							"actions": [
								"inspectSettings", "saveSettings", "loadSettings"
							]
						},
						{
							"name": "resetSettings"
						}
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
							"replaceKeyPattern": / @ .+$/,
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
						{
							"name": "webGLVendor",
							"displayDependencies": [
								{
									"displayAdvancedSettings": [true]
								}
							]
						},
						{
							"name": "webGLRenderer",
							"displayDependencies": [
								{
									"displayAdvancedSettings": [true]
								}
							]
						},
						{
							"name": "webGLUnmaskedVendor",
							"displayDependencies": [
								{
									"displayAdvancedSettings": [true]
								}
							]
						},
						{
							"name": "webGLUnmaskedRenderer",
							"displayDependencies": [
								{
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
							"replaceKeyPattern": / @ .+$/,
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
							"replaceKeyPattern": / @ .+$/,
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
							"replaceKeyPattern": / @ .+$/,
							"displayedSection": "Window-API",
							"displayDependencies": [
								{
									"protectWindow": [true],
									"displayAdvancedSettings": [true]
								}
							]
						},
						{
							"name": "allowWindowNameInFrames",
							"displayDependencies": [
								{
									"protectWindow": [true]
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
							"replaceKeyPattern": / @ .+$/,
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
					name: "SVG-API",
					settings: [
						{
							"name": "protectSVG"
						},
						{
							"name": "protectedAPIFeatures",
							"replaceKeyPattern": / @ .+$/,
							"displayedSection": "SVG-API",
							"displayDependencies": [
								{
									"protectSVG": [true],
									"displayAdvancedSettings": [true]
								}
							]
						},
					]
				},
				{
					name: "TextMetrics-API",
					settings: [
						{
							"name": "protectTextMetrics"
						},
						{
							"name": "protectedAPIFeatures",
							"replaceKeyPattern": / @ .+$/,
							"displayedSection": "TextMetrics-API",
							"displayDependencies": [
								{
									"protectTextMetrics": [true],
									"displayAdvancedSettings": [true]
								}
							]
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
							"replaceKeyPattern": / @ .+$/,
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
				{
					name: "Screen-API",
					settings: [
						{
							"name": "protectScreen"
						},
						{
							"name": "protectedAPIFeatures",
							"replaceKeyPattern": / @ .+$/,
							"displayedSection": "Screen-API",
							"displayDependencies": [
								{
									"protectScreen": [true],
									"displayAdvancedSettings": [true]
								}
							]
						},
						{
							"name": "screenSize",
							"displayDependencies": [
								{
									"protectScreen": [true],
									"fakeMinimalScreenSize": [false],
									"displayAdvancedSettings": [true]
								}
							]
						},
						{
							"name": "fakeMinimalScreenSize",
							"displayDependencies": [
								{
									"protectScreen": [true],
									"screenSize": [""]
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