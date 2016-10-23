/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const {utils: Cu} = Components;
	const COMMONJS_URI = "resource://gre/modules/commonjs";
	const {require} = Cu.import(COMMONJS_URI + "/toolkit/require.js", {});
	const {intercept, setExportFunction} = require("../lib/intercept.js");
	setExportFunction(Cu.exportFunction);
	const {ask} = require("../lib/askForPermission.js");
	
	// Variable to "unload" the script
	var enabled = true;
	
	function check(message){
		if (enabled){
			var status = sendSyncMessage(
				"canvasBlocker-check",
				message
			);
			return status[0];
		}
		else {
			return {type: [], mode: "allow"};
		}
	}
	function askWrapper(data){
		return ask(data, {
			_: function(token){
				return sendSyncMessage(
					"canvasBlocker-translate",
					token
				)[0];
			},
			prefs
		});
	}
	function notify(data){
		sendAsyncMessage("canvasBlocker-notify", data);
	}
	function prefs(name){
		return sendSyncMessage(
			"canvasBlocker-pref-get",
			name
		)[0];
	}
	
	function interceptWrapper(ev){
		if (enabled){
			// window is only equal to content for the top window. For susequent
			// calls (e.g. iframe windows) the new generated window has to be 
			// used.
			
			var window = ev.target.defaultView;
			intercept(
				{subject: window},
				{check, ask: askWrapper, notify, prefs}
			);
		}
	}
	
	addEventListener("DOMWindowCreated", interceptWrapper);
	var context = this;
	addEventListener("unload", function(ev){
		if (ev.target === context){
			removeEventListener("DOMWindowCreated", interceptWrapper);
		}
	});
	addMessageListener("canvasBlocker-unload", function unload(){
		enabled = false;
		removeEventListener("DOMWindowCreated", interceptWrapper);
		removeMessageListener("canvasBlocker-unload", unload);
	});
}());