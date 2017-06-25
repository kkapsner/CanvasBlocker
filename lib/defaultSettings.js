"use strict";

var settings = {	whiteList: "",	blackList: "",	blockMode: "fakeReadout",	maxFakeSize: 0,	rng: "nonPersistent",	persistentRndStorage: "",	storePersistentRnd: false,	askOnlyOnce: true,	showNotifications: true,	notificationDisplayTime: 30,	ignoreList: "",	showCallingFile: false,	showCompleteCallingStack: false,	enableStackList: false,	stackList: ""
};

(function(){
	browser.storage.onChanged.addListener(function(change, area){
		if (area === "local"){
			Object.keys(change).forEach(function(key){
				settings[key] = change[key].newValue;
			});
		}
	});
}());