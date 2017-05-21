/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	browser.storage.local.set({
		storageVersion: 0.1
	});
	
	var port = browser.runtime.connect();
	port.onMessage.addListener(function(data){
		if (data){
			browser.storage.local.set(data);
		}
	});
}());