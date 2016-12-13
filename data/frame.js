/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	const {utils: Cu} = Components;
	var chrome =  {
		Cc: Components.classes,
		Ci: Components.interfaces,
		Cm: Components.manager,
		Cr: Components.results,
		Cu: Components.utils,
		CC: Components.Constructor,
		components: Components,
		ChromeWorker: undefined
	};
	const { Loader, Require, unload, Module} = Components.utils.import('resource://gre/modules/commonjs/toolkit/loader.js');
	var loader = Loader({
		paths: {
			"": "resource://gre/modules/commonjs/"
		},
		modules: {
			"chrome": chrome
		}
	});
	var requirer = Module("resource://canvasblocker-at-kkapsner-dot-de/data/frame.js", "./data/frame.js");
	var require = Require(loader, requirer);
	const {intercept} = require("../lib/intercept.js");
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
	function checkStack(stack){
		if (enabled){
			var status = sendSyncMessage(
				"canvasBlocker-checkStack",
				stack
			);
			return status[0];
		}
		else {
			return true;
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
				{check, checkStack, ask: askWrapper, notify, prefs}
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