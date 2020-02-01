/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(async function(){
	"use strict";
	
	const extension = require("../lib/extension");
	const logging = require("../lib/logging");
	logging.setPrefix("preset page");
	
	const settings = require("../lib/settings");
	const searchParameters = new URLSearchParams(window.location.search);
	require("./theme").init("presets");
	
	function buildPresetSettingGui(setting, value){
		function valueToText(value){
			switch (typeof value){
				case "string":
					return extension.getTranslation(`${setting}_options.${value}`);
				case "boolean":
					return value? "\u2713": "\u00D7";
				default:
					return value.toString();
			}
		}
		
		const container = document.createElement("li");
		container.textContent = extension.getTranslation(`${setting}_title`) + ": ";
		if ((typeof value) === "object"){
			const urlValues = document.createElement("ul");
			Object.keys(value).map(function(url){
				const container = document.createElement("li");
				container.className = "urlValue";
				container.textContent = url + ": " +
					valueToText(value[url]) +
					" (" + valueToText(settings.get(setting, url)) +")";
				return container;
				
			}).forEach(function(node){
				urlValues.appendChild(node);
			});
			container.appendChild(urlValues);
		}
		else {
			container.appendChild(document.createTextNode(
				`${valueToText(value)} (${valueToText(settings.get(setting))})`
			));
		}
		
		return container;
	}
	
	function buildPresetGui(presetName, preset){
		const container = document.createElement("div");
		container.className = "preset " + presetName;
		const title = document.createElement("h1");
		title.className = "title";
		title.textContent = extension.getTranslation(`preset_${presetName}_title`);
		container.appendChild(title);
		
		const description = document.createElement("div");
		description.className = "description";
		description.textContent = extension.getTranslation(`preset_${presetName}_description`);
		container.appendChild(description);
		
		const settingsList = document.createElement("ul");
		settingsList.className = "settings";
		container.appendChild(settingsList);
		
		Object.keys(preset).map(function(settingName){
			return buildPresetSettingGui(settingName, preset[settingName]);
		}).forEach(function(node){
			settingsList.appendChild(node);
		});
		
		if (settingsList.childNodes.length){
			const button = document.createElement("button");
			button.textContent = extension.getTranslation("apply");
			button.addEventListener("click", async function(){
				await Promise.all(Object.keys(preset).map(function(settingName){
					const value = preset[settingName];
					if ((typeof value) === "object"){
						return Promise.all(Object.keys(value).map(function(url){
							return settings.set(settingName, value[url], url);
						}));
					}
					else {
						return settings.set(settingName, value);
					}
				}));
				
				window.location.reload();
			});
			container.appendChild(button);
		}
		
		return container;
	}
	
	function fitContentToWindowSize(){
		if (window.innerHeight > document.body.getBoundingClientRect().bottom){
			const computedStyle = window.getComputedStyle(document.body);
			const availableHeight = window.innerHeight - parseFloat(computedStyle.marginBottom);
			const originalFontSize = parseFloat(computedStyle.fontSize) || 10;
			let fontSize = originalFontSize;
			let lastDelta = 8;
			
			while (
				availableHeight > document.body.getBoundingClientRect().bottom
			){
				fontSize += lastDelta;
				document.body.style.fontSize = fontSize + "px";
			}
			let direction = -1;
			while (
				lastDelta > 0.125
			){
				lastDelta /= 2;
				fontSize += direction * lastDelta;
				document.body.style.fontSize = fontSize + "px";
				direction = Math.sign(availableHeight - document.body.getBoundingClientRect().bottom);
			}
			while (availableHeight < document.body.getBoundingClientRect().bottom){
				fontSize -= lastDelta;
				document.body.style.fontSize = fontSize + "px";
			}
		}
	}
	
	document.querySelector("head title").textContent = extension.getTranslation("presets_title");
	let head = document.createElement("header");
	document.body.insertBefore(head, document.body.firstChild);
	
	let heading = document.createElement("h1");
	heading.textContent = extension.getTranslation("presets");
	head.appendChild(heading);
	
	if (searchParameters.has("notice")){
		const noticeName = `presets_${searchParameters.get("notice")}Notice`;
		const noticeText = extension.getTranslation(noticeName);
		if (noticeText){
			const notice = document.createElement("div");
			notice.className = noticeName + " notice";
			notice.appendChild(extension.parseTranslation(noticeText));
			
			head.appendChild(notice);
		}
	}
	
	let introduction = document.createElement("div");
	introduction.className = "introduction";
	introduction.textContent = extension.getTranslation("presets_introduction");
	head.appendChild(introduction);
	
	const [, presets] = await Promise.all([
		settings.loaded,
		(await fetch("presets.json")).json()
	]);
	
	Object.keys(presets).map(function(presetName){
		return buildPresetGui(presetName, presets[presetName]);
	}).forEach(function(node){
		document.body.appendChild(node);
	});
	
	fitContentToWindowSize();
}());