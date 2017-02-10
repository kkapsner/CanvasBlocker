/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	const {process, frames} = require("sdk/remote/child");
	const {intercept} = require("./intercept.js");
	const {ask} = require("./askForPermission.js");
	const {check: originalCheck, checkStack: originalCheckStack} = require("./check.js");
	
	// Variable to "unload" the script
	var enabled = true;
	
	
	
	function check(message){
		if (enabled){
			return originalCheck(message);
		}
		else {
			return {type: [], mode: "allow"};
		}
	}
	function checkStack(stack){
		if (enabled){
			return originalCheckStack(stack);
		}
		else {
			return true;
		}
	}
	const _ = require("sdk/l10n").get;
	function askWrapper(data){
		return ask(data, {
			_,
			prefs
		});
	}
	function notify(data){
		process.port.emit("canvasBlocker-notify", data);
	}
	
	const preferences = require("sdk/simple-prefs");
	function prefs(name){
		return preferences.prefs[name];
	}
	
	frames.forEvery(function(frame){
		frame.addEventListener("DOMWindowCreated", function(ev){
			function notify(data){
				frame.port.emit("canvasBlocker-notify", data);
			}
			if (enabled){
				var subject = ev.target.defaultView;
				intercept(
					{subject},
					{check, checkStack, ask: askWrapper, notify, prefs}
				);
			}
		});
	});

	process.port.on("canvasBlocker-unload", function unload(){
		enabled = false;
	});
}());