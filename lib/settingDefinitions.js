/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	var settingDefinitions = [
		{
			name: "logLevel",
			defaultValue: 1,
			options: [0, 1, 25, 50, 75, 100]
		},
		{
			name: "urlSettings",
			defaultValue: [],
			urlContainer: true,
			entries: [
				{name: "url", defaultValue: ""}
			]
		},
		{
			name: "hiddenSettings",
			hideContainer: true,
			defaultValue: {}
		},
		{
			name: "displayHiddenSettings",
			defaultValue: false
		},
		{
			name: "urls",
			defaultValue: [],
			dynamic: true,
			dependencies: ["urlSettings"],
			getter: function(settings){
				return settings.urlSettings.map(function(urlSetting){
					return urlSetting.url;
				});
			}
		},
		{
			name: "whiteList",
			defaultValue: ""
		},
		{
			name: "sessionWhiteList",
			resetOnStartup: true,
			defaultValue: ""
		},
		{
			name: "blackList",
			defaultValue: ""
		},
		{
			name: "blockMode",
			defaultValue: "fakeReadout",
			urlSpecific: true,
			options: [
				"blockReadout", "fakeReadout", "fakeInput", "askReadout", null,
				"blockEverything", "block", "ask", "allow", "allowEverything"
			]
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
			options: ["white", "nonPersistent", "constant", "persistent"]
		},
		{
			name: "apiWhiteList",
			defaultValue: {},
			keys: [
				{name: "Canvas-API", level: 1},
				"getContext",
				{message: "readout", level: 2},
				"toDataURL", "toBlob", "mozGetAsFile", "getImageData",
				"isPointInPath", "isPointInStroke",
				{message: "input", level: 2},
				"fillText", "strokeText",
				{name: "webGL", level: 2},
				"readPixels",
				{name: "Audio-API", leve: 1},
				"getFloatFrequencyData", "getByteFrequencyData", "getFloatTimeDomainData", "getByteTimeDomainData",
				"getChannelData", "copyFromChannel",
				"getFrequencyResponse"
			],
			defaultKeyValue: false
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
			name: "minColors",
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
			name: "persistentRndClearIntervalValue",
			defaultValue: 0
		},
		{
			name: "persistentRndClearIntervalUnit",
			defaultValue: "days",
			options: ["seconds", "minutes", "hours", "days", "weeks", "months", "years"]
		},
		{
			name: "lastPersistentRndClearing",
			defaultValue: 0
		},
		{
			name: "askOnlyOnce",
			defaultValue: "individual",
			options: ["no", "individual", "combined"]
		},
		{
			name: "askDenyMode",
			defaultValue: "block",
			options: ["block", "fake"]
		},
		{
			name: "showCanvasWhileAsking",
			defaultValue: true
		},
		{
			name: "showNotifications",
			defaultValue: true,
			urlSpecific: true
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
			name: "protectAudio",
			defaultValue: true
		},
		{
			name: "audioFakeRate",
			defaultValue: "100",
			options: ["1", "10", "100", "1000", "0.1%", "1%", "10%", "100%"]
		},
		{
			name: "audioNoiseLevel",
			defaultValue: "minimal",
			options: ["minimal", "low", "medium", "high", "maximal"]
		},
		{
			name: "useAudioCache",
			defaultValue: true
		},
		{
			name: "audioUseFixedIndices",
			defaultValue: true
		},
		{
			name: "audioFixedIndices",
			defaultValue: function(){
				return Math.floor(Math.random() * 30).toString(10);
			}
		},
		{
			name: "blockRequestsFromDataURL",
			defaultValue: true
		},
		{
			name: "displayAdvancedSettings",
			defaultValue: false
		},
		{
			name: "displayDescriptions",
			defaultValue: false
		},
		{
			name: "isStillDefault",
			defaultValue: true
		},
		{
			name: "storageVersion",
			defaultValue: 0.3,
			fixed: true
		}
	];
	
	if ((typeof module) !== "undefined"){
		module.exports = settingDefinitions;
	}
	else {
		window.scope.settingDefinitions = settingDefinitions;
	}
}());