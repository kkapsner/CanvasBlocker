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
			defaultValue: true
		},
		{
			name: "askDenyMode",
			defaultValue: "block",
			options: ["block", "fake"]
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
		},
		{
			name: "storageVersion",
			defaultValue: 0.1
		}
	];
	
	if ((typeof module) !== "undefined"){
		module.exports = settingDefinitions;
	}
	else {
		window.scope.settingDefinitions = settingDefinitions;
	}
}());