/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	const logging = require("./logging");
	logging.setPrefix("options page");
	
	const optionsGui = require("./optionsGui");
	const settings = require("./settings");
	const settingsDisplay = require("./settingsDisplay");

	var callbacks = {
		showReleaseNotes: function(){
			logging.verbose("open release notes");
			window.open("../releaseNotes.txt", "_blank");
		},
		clearPersistentRnd: function(){
			logging.message("clear persistent rnd storage");
			logging.notice("empty storage");
			settings.persistentRndStorage = "";
			logging.notice("send message to main script");
			browser.runtime.sendMessage({"canvasBlocker-clear-domain-rnd": true});
		}
	};
	
	var table = document.createElement("table");
	table.className = "settings " + (settings.displayDescriptions? "display": "hide") + "Descriptions";
	settings.on("displayDescriptions", function(){
		table.className = "settings " + (settings.displayDescriptions? "display": "hide") + "Descriptions";
	});
	
	document.body.appendChild(table);
	settingsDisplay.forEach(function(display){
		var setting = settings.getDefinition(display.name);
		if (!setting){
			if (display.inputs){
				setting = {
					name: display.name,
					inputs: display.inputs.map(settings.getDefinition)
				};
			}
			else if (callbacks[display.name]){
				setting = {
					name: display.name,
					action: callbacks[display.name]
				};
			}
		}
		if (setting){
			var row = optionsGui.createSettingRow(setting);
			table.appendChild(row);
			if (display.displayDependencies){
				var displayDependencies = display.displayDependencies;
				displayDependencies = Array.isArray(displayDependencies)?
					displayDependencies:
					[displayDependencies];
				var computeDependencies = function(){
					logging.verbose("evaluate display dependencies for", setting);
					row.classList[(
						displayDependencies.some(function(displayDependency){
							return Object.keys(displayDependency).every(function(key){
								return displayDependency[key].indexOf(settings[key]) !== -1;
							});
						})
					)? "remove": "add"]("hidden");
				};
				computeDependencies();
				displayDependencies.forEach(function(displayDependency){
					Object.keys(displayDependency).forEach(function(name){
						settings.on(name, computeDependencies);
					});
				});
			}
		}
	});
}());
