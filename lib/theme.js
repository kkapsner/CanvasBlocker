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
	const extension = require("./extension");
	
	scope.init = function(page){
		const basePath = extension.getURL("themes");
		
		const baseLink = document.createElement("link");
		baseLink.href = `${basePath}/base/layout.css`;
		baseLink.rel = "stylesheet";
		baseLink.type = "text/css";
		document.head.appendChild(baseLink);
		const links = ["layout", page].filter(function(file){
			return file;
		}).map(function(file){
			const link = document.createElement("link");
			link.cbFile = file;
			link.rel = "alternative";
			link.type = "text/css";
			document.head.appendChild(link);
			return link;
		});
		
		function setTheme(theme){
			switch (theme){
				case "none":
					baseLink.rel = "alternative";
					links.forEach(function(link){
						link.rel = "alternative";
					});
					break;
				case "auto":
					if (window.matchMedia("(prefers-color-scheme: dark)").matches){
						theme = "dark";
					}
					else {
						theme = "default";
					}
					// fall through
				default:
					baseLink.rel = "stylesheet";
					links.forEach(function(link){
						link.rel = "stylesheet";
						link.href = `${basePath}/${theme}/${link.cbFile}.css`;
					});
			}
		}
		
		settings.onloaded(function(){
			setTheme(settings.theme);
			settings.on("theme", function(){
				setTheme(settings.theme);
			});
		});
	};
}());