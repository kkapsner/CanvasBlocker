"use strict";

var settings = {
	logLevel: 1,
	whiteList: "",
	blackList: "",
	blockMode: "fakeReadout",
	minFakeSize: 1,
	maxFakeSize: 0,
	rng: "nonPersistent",
	useCanvasCache: true,
	ignoreFrequentColors: 0,
	fakeAlphaChannel: false,
	persistentRndStorage: "",
	storePersistentRnd: false,
	askOnlyOnce: true,
	showNotifications: true,
	storeImageForInspection: false,
	ignoreList: "",
	showCallingFile: false,
	showCompleteCallingStack: false,
	enableStackList: false,
	stackList: "",
	displayAdvancedSettings: false,

	// indicator if the real settings are loaded already
	isStillDefault: true
};