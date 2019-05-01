/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./theme", {});
	}
	
	const settings = require("./settings");
	
	scope.init = function(page){
		const basePath = browser.extension.getURL("themes");
		settings.onloaded(function(){
			const links = ["layout", page].filter(function(file){
				return file;
			}).map(function(file){
				var link = document.createElement("link");
				link.cbFile = file;
				link.href = `${basePath}/${settings.theme}/${file}.css`;
				link.rel = "stylesheet";
				link.type = "text/css";
				document.head.appendChild(link);
				return link;
			});
			settings.on("theme", function(){
				links.forEach(function(link){
					link.href = `${basePath}/${settings.theme}/${link.cbFile}.css`;
				});
			});
		});
	};
}());