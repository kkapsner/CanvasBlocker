/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const extension = require("../lib/extension");
	const settings = require("../lib/settings");
	const settingContainers = require("../lib/settingContainers");
	require("../lib/theme").init();
	const searchParameters = new URLSearchParams(window.location.search);
	
	
	const title = document.createElement("h1");
	title.className = "title";
	title.textContent = extension.getTranslation("whitelist_inspection_title");
	document.body.appendChild(title);
	
	document.querySelector("head title").textContent = title.textContent;
	
	const description = document.createElement("div");
	description.className = "description";
	description.appendChild(extension.parseTranslation(extension.getTranslation("whitelist_inspection_description")));
	
	document.body.appendChild(description);
	
		
	const whitelistSettings = [
		{
			title: extension.getTranslation("whitelist_all_apis"),
			name: "blockMode",
			whitelistValue: "allow",
			protectedValue: "fake"
		},
		{
			title: extension.getTranslation("section_canvas-api"),
			name: "protectedCanvasPart",
			whitelistValue: "nothing",
			protectedValue: "readout"
		},
		{
			title: extension.getTranslation("section_audio-api"),
			name: "protectAudio",
			whitelistValue: false,
			protectedValue: true
		},
		{
			title: extension.getTranslation("section_history-api"),
			name: "historyLengthThreshold",
			whitelistValue: 10000,
			protectedValue: 2
		},
		{
			title: extension.getTranslation("section_window-api"),
			name: "protectWindow",
			whitelistValue: false,
			protectedValue: true
		},
		{
			title: extension.getTranslation("section_DOMRect-api"),
			name: "protectDOMRect",
			whitelistValue: false,
			protectedValue: true
		},
		{
			title: extension.getTranslation("section_SVG-api"),
			name: "protectSVG",
			whitelistValue: false,
			protectedValue: true
		},
		{
			title: extension.getTranslation("section_navigator-api"),
			name: "protectNavigator",
			whitelistValue: false,
			protectedValue: true
		},
		{
			title: extension.getTranslation("section_screen-api"),
			name: "protectScreen",
			whitelistValue: false,
			protectedValue: true
		},
	];
	
	const table = document.createElement("table");
	table.className = "whitelist";
	document.body.appendChild(table);
	
	const header = document.createElement("thead");
	table.appendChild(header);
	
	const headerRow = document.createElement("tr");
	header.appendChild(headerRow);
	
	const urlCell = document.createElement("th");
	urlCell.textContent = "URL";
	headerRow.appendChild(urlCell);
	
	whitelistSettings.forEach(function(setting){
		const cell = document.createElement("th");
		cell.textContent = setting.title;
		setting.headerCell = cell;
		headerRow.appendChild(cell);
	});
	const tableBody = document.createElement("tbody");
	table.appendChild(tableBody);
	settings.onloaded(function(){
		const sets = Array.from(settingContainers.urlContainer.get());
		
		if (searchParameters.has("urls")){
			const urls = JSON.parse(searchParameters.get("urls")).map(function(url){
				return new URL(url);
			});
			if (
				!sets.some(function(set, index){
					if (urls.some(function(url){
						return set.match && set.match(url);
					})){
						set.highlight = true;
						return true;
					}
					return false;
				}) &&
				searchParameters.has("domain")
			){
				sets.unshift({url: searchParameters.get("domain"), highlight: true});
			}
		}
		
		const setNodes = new Map();
		sets.forEach(function(set){
			const row = document.createElement("tr");
			if (set.highlight){
				row.className = "highlight";
			}
			tableBody.appendChild(row);
			
			const urlCell = document.createElement("td");
			urlCell.textContent = set.url;
			row.appendChild(urlCell);
			
			const nodes = new Map();
			whitelistSettings.forEach(function(setting){
				const settingDefinition = settings.getDefinition(setting.name);
				const cell = document.createElement("td");
				cell.className = "inputCell";
				row.appendChild(cell);
				
				const input = document.createElement("input");
				input.type = "checkbox";
				input.addEventListener("change", function(){
					const value = this.checked? setting.protectedValue: setting.whitelistValue;
					if (settingDefinition.get() === value){
						settingDefinition.reset(set.url);
					}
					else {
						settingDefinition.set(value, set.url);
					}
				});
				nodes.set(setting, {cell, input});
				cell.appendChild(input);
			});
			setNodes.set(set, nodes);
		});
		
		function update(){
			sets.forEach(function(set){
				const nodes = setNodes.get(set);
				whitelistSettings.forEach(function(setting){
					const display = settings.get(setting.name) === setting.whitelistValue?
						"none":
						"";
					setting.headerCell.style.display = display;
					const currentValue = settings.get(setting.name, set.url);
					const node = nodes.get(setting);
					node.cell.style.display = display;
					node.input.checked = currentValue !== setting.whitelistValue;
				});
			});
		}
		update();
		settings.on("any", update);
	});
}());