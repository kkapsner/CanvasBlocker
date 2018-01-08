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
		},
		exportSettings: function(){
			logging.verbose("open settings export");
			window.open("export.html", "_blank");
		},
		resetSettings: function(){
			if (window.confirm(browser.i18n.getMessage("resetSettings_confirm"))){
				browser.storage.local.clear();
			}
		}
	};
	
	if (window === window.top){
		let head = document.createElement("header");
		let heading = document.createElement("h1");
		heading.textContent = browser.i18n.getMessage("options");
		head.appendChild(heading);
		
		let introduction = document.createElement("div");
		introduction.textContent = browser.i18n.getMessage("optionsIntroduction");
		head.appendChild(introduction);
		
		if (window.location.search){
			let noticeName = window.location.search.substr(1).trim() + "Notice";
			let notice = browser.i18n.getMessage(noticeName);
			if (notice){
				let bookmarkingNotice = document.createElement("div");
				bookmarkingNotice.className = noticeName + " bookmarkNotice";
				bookmarkingNotice.textContent = notice;
				head.appendChild(bookmarkingNotice);
			}
		}
		
		document.body.appendChild(head);
		document.body.classList.add("standalone");
	}
	
	var table = document.createElement("table");
	table.className = "settings " + (settings.displayDescriptions? "display": "hide") + "Descriptions";
	settings.on("displayDescriptions", function(){
		table.className = "settings " + (settings.displayDescriptions? "display": "hide") + "Descriptions";
	});
	document.body.appendChild(table);
	
	let lastSection = null;
	let addSection = function addSection(name){
		let body = document.createElement("tbody");
		if (name){
			let row = document.createElement("tr");
			row.className = "section";
			let cell = document.createElement("td");
			cell.colSpan = 2;
			row.appendChild(cell);
			let heading = document.createElement("h2");
			heading.textContent = browser.i18n.getMessage("section_" + name);
			cell.appendChild(heading);
			body.appendChild(row);
		}
		table.appendChild(body);
		let rows = [];
		let section = {
			addRow: function(row){
				rows.push(row);
				body.appendChild(row);
			},
			updateDisplay: function(){
				var anyVisible = false;
				rows.forEach(function(row){
					var isHidden = row.classList.contains("hidden");
					if (!isHidden){
						if (anyVisible){
							row.classList.remove("firstVisible");
						}
						else {
							anyVisible = true;
							row.classList.add("firstVisible");
						}
					}
				});
				body.classList[anyVisible? "remove": "add"]("hidden");
			}
		};
		lastSection = section;
	};
	addSection();
	
	settingsDisplay.forEach(function(display){
		if (typeof display === "string"){
			addSection(display);
		}
		else {
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
				let section = lastSection;
				section.addRow(row);
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
						section.updateDisplay();
					};
					computeDependencies();
					displayDependencies.forEach(function(displayDependency){
						Object.keys(displayDependency).forEach(function(name){
							settings.on(name, computeDependencies);
						});
					});
				}
			}
		}
	});
}());
