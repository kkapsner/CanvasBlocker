/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	const { Cu } = require('chrome');
	const { on } = require('sdk/system/events');
	const self = require('sdk/self');
	const { AddonManager } = Cu.import("resource://gre/modules/AddonManager.jsm");
	const { setTimeout } = require("sdk/timers");
	const { loadSheet } = require("sdk/stylesheet/utils");
	AddonManager.getAddonByID(self.id, function(addon){
		on('addon-options-displayed', onAddonOptionsDisplayed, true);
	});

  function onAddonOptionsDisplayed({ subject: doc, data }) {
    if (data === self.id) {
		loadSheet(doc.defaultView, self.data.url("options.css"));
		
		// need to wait unttil the simple-prefs are inserted in the DOM
		setTimeout(function(){
			// replace empty menuitems with separators
			[].slice.call(doc.querySelectorAll("menuitem[value='']")).forEach(
				function(menuitem){
					var separator = doc.createElement("menuseparator");
					menuitem.parentNode.replaceChild(separator, menuitem);
				}
			);
		}, 1);
    }
  }
	
}());