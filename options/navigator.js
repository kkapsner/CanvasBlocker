/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const extension = require("../lib/extension");
	const settings = require("../lib/settings");
	const navigator = require("../lib/navigator");
	require("../lib/theme").init();
	
	const title = document.createElement("h1");
	title.className = "title";
	title.textContent = extension.getTranslation("navigatorSettings_title");
	document.body.appendChild(title);
	
	document.querySelector("head title").textContent = title.textContent;
	
	const description = document.createElement("div");
	description.className = "description";
	description.textContent = extension.getTranslation("navigatorSettings_description");
	document.body.appendChild(description);
	
	const disclaimer = document.createElement("div");
	disclaimer.className = "disclaimer";
	disclaimer.textContent = extension.getTranslation("navigatorSettings_disclaimer");
	document.body.appendChild(disclaimer);
	
	function presetSection(title, presets){
		const container = document.createElement("div");
		container.className = "presetSection";
		
		const titleNode = document.createElement("h2");
		titleNode.className = "title";
		titleNode.textContent = extension.getTranslation("navigatorSettings_presetSection." + title);
		container.appendChild(titleNode);
		
		const presetsList = document.createElement("ul");
		presetsList.className = "presets";
		container.appendChild(presetsList);
		
		Object.keys(presets).forEach(function(presetName){
			const li = document.createElement("li");
			li.className = "preset " + presetName;
			presetsList.appendChild(li);
			
			const button = document.createElement("button");
			button.className = "button";
			button.textContent = presetName;
			li.appendChild(button);
			
			const presetProperties = presets[presetName];
			function checkActive(currentProperties){
				if (Object.keys(presetProperties).every(function(property){
					let value = presetProperties[property];
					if ((typeof value) === "function"){
						value = value(currentProperties);
					}
					return value === currentProperties[property];
				})){
					li.classList.add("active");
				}
				else {
					li.classList.remove("active");
				}
			}
			settings.on("navigatorDetails", function({newValue}){
				checkActive(newValue);
			});
			settings.onloaded(function(){
				checkActive(settings.navigatorDetails);
			});
			
			button.addEventListener("click", function(){
				const data = settings.navigatorDetails;
				Object.keys(presetProperties).forEach(function(property){
					if (presetProperties[property] === undefined){
						delete data[property];
					}
					else {
						let value = presetProperties[property];
						if ((typeof value) === "function"){
							value = value(data);
						}
						data[property] = value;
					}
				});
				settings.navigatorDetails = data;
			});
		});
		
		return container;
	}
	
	const firefoxOscpu = {
		Windows: "{platformDetails}",
		Linux: "{platform}",
		"Mac OS X": "Intel Mac OS X 10.14.3",
		"": "{original value}"
	};
	
	const osPresets = {
		Windows: {
			osPreset: "Windows",
			windowManager: "Windows",
			platform: "Win32",
			platformDetails: "Windows NT 10.0; Win64; x64",
			oscpu: function(currentProperties){
				if (currentProperties.browserPreset === "Firefox"){
					return firefoxOscpu.Windows;
				}
				return "{undefined}";
			}
		},
		Linux: {
			osPreset: "Linux",
			windowManager: "X11",
			platform: "Linux x86_64",
			platformDetails: "X11; Linux x86_64",
			oscpu: function(currentProperties){
				if (currentProperties.browserPreset === "Firefox"){
					return firefoxOscpu.Linux;
				}
				return "{undefined}";
			}
		},
		"Mac OS X": {
			osPreset: "Mac OS X",
			windowManager: "Macintosh",
			platform: "MacIntel",
			platformDetails: "Macintosh; Intel Mac OS X 10.14.3",
			oscpu: function(currentProperties){
				if (currentProperties.browserPreset === "Firefox"){
					return firefoxOscpu["Mac OS X"];
				}
				return "{undefined}";
			}
		}
	};
	
	const browserPresets = {
		Edge: {
			browserPreset: "Edge",
			chromeVersion: "71.0.3578.98",
			edgeVersion: "17.17134",
			firefoxVersion: undefined,
			operaVersion: undefined,
			safariVersion: undefined,
			
			appVersion: "5.0 ({platformDetails}) AppleWebKit/537.36 (KHTML, like Gecko) " +
				"Chrome/{chromeVersion} Safari/537.36 Edge/{edgeVersion}",
			buildID: "{undefined}",
			oscpu: "{undefined}",
			productSub: "20030107",
			userAgent: "Mozilla/{appVersion}",
			vendor: undefined,
		},
		Opera: {
			browserPreset: "Opera",
			chromeVersion: "71.0.3578.98",
			edgeVersion: undefined,
			firefoxVersion: undefined,
			operaVersion: "58.0.3135.65",
			safariVersion: undefined,
			
			appVersion: "5.0 ({platformDetails}) AppleWebKit/537.36 (KHTML, like Gecko) " +
				"Chrome/{chromeVersion} Safari/537.36 OPR/{operaVersion}",
			buildID: "{undefined}",
			oscpu: "{undefined}",
			productSub: "20030107",
			userAgent: "Mozilla/{appVersion}",
			vendor: "Google Inc.",
		},
		Chrome: {
			browserPreset: "Chrome",
			chromeVersion: "71.0.3578.98",
			edgeVersion: undefined,
			firefoxVersion: undefined,
			operaVersion: undefined,
			safariVersion: undefined,
			
			appVersion: "5.0 ({platformDetails}) AppleWebKit/537.36 (KHTML, like Gecko) " +
				"Chrome/{chromeVersion} Safari/537.36",
			buildID: "{undefined}",
			oscpu: "{undefined}",
			productSub: "20030107",
			userAgent: "Mozilla/{appVersion}",
			vendor: "Google Inc.",
		},
		Safari: {
			browserPreset: "Safari",
			chromeVersion: undefined,
			edgeVersion: undefined,
			firefoxVersion: undefined,
			operaVersion: undefined,
			safariVersion: "12.0.3",
			
			appVersion: "5.0 ({platformDetails}) AppleWebKit/605.1.15 (KHTML, like Gecko) " +
				"Version/{safariVersion} Safari/605.1.15",
			buildID: "{undefined}",
			oscpu: "{undefined}",
			productSub: "20030107",
			userAgent: "Mozilla/{appVersion}",
			vendor: "Apple Computer, Inc.",
		},
		Firefox: {
			browserPreset: "Firefox",
			chromeVersion: undefined,
			edgeVersion: undefined,
			firefoxVersion: "{real Firefox version}",
			operaVersion: undefined,
			safariVersion: undefined,
			
			appVersion: "5.0 ({windowManager})",
			buildID: "20181001000000",
			oscpu: function(currentProperties){
				return firefoxOscpu[currentProperties.osPreset || ""] || "{original value}";
			},
			productSub: "20100101",
			userAgent: "Mozilla/5.0 ({platformDetails}; rv:{firefoxVersion}) Gecko/20100101 Firefox/{firefoxVersion}",
			vendor: undefined,
		}
	};
	
	document.body.appendChild(presetSection("os", osPresets));
	document.body.appendChild(presetSection("browser", browserPresets));
	
	const valueTitle = document.createElement("h2");
	valueTitle.textContent = extension.getTranslation("navigatorSettings_values");
	document.body.appendChild(valueTitle);
	
	const valueSection = document.createElement("table");
	valueSection.className = "values";
	document.body.appendChild(valueSection);
	
	function updateValueSection(currentProperties){
		function createPropertyRow(section, property){
			const row = document.createElement("tr");
			
			const name = document.createElement("td");
			name.textContent = property;
			row.appendChild(name);
			
			const value = document.createElement("td");
			row.appendChild(value);
			
			const input = document.createElement("input");
			value.appendChild(input);
			input.value = currentProperties.hasOwnProperty(property)? currentProperties[property]: "{original value}";
			input.addEventListener("change", function(){
				currentProperties[property] = this.value;
				settings.navigatorDetails = currentProperties;
			});
			
			const computedValue = document.createElement("td");
			computedValue.textContent = navigator.getNavigatorValue(property);
			row.appendChild(computedValue);
			
			section.appendChild(row);
		}
		
		valueSection.innerHTML = "";
		let section = document.createElement("tbody");
		section.className = "helperValues";
		valueSection.appendChild(section);
		
		Object.keys(currentProperties).filter(function(property){
			return navigator.allProperties.indexOf(property) === -1;
		}).sort().forEach(createPropertyRow.bind(undefined, section));
		
		section = document.createElement("tbody");
		section.className = "realValues";
		valueSection.appendChild(section);
		
		navigator.allProperties.forEach(createPropertyRow.bind(undefined, section));
	}
	
	settings.on("navigatorDetails", function({newValue}){
		updateValueSection(newValue);
	});
	settings.onloaded(function(){
		updateValueSection(settings.navigatorDetails);
	});
	
	const resetButton = document.createElement("button");
	resetButton.className = "button";
	resetButton.textContent = extension.getTranslation("navigatorSettings_reset");
	resetButton.addEventListener("click", function(){
		settings.navigatorDetails = {};
	});
	document.body.appendChild(resetButton);
}());