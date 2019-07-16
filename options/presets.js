/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const extension = require("../lib/extension");
	const logging = require("../lib/logging");
	logging.setPrefix("preset page");
	
	const settings = require("../lib/settings");
	const searchParameters = new URLSearchParams(window.location.search);
	require("./theme").init("presets");
	
	Promise.all([
		settings.loaded,
		fetch("presets.json").then(function(data){
			return data.json();
		})
	]).then(function([settingsLoaded, presets]){
		Object.keys(presets).map(function(presetName){
			const preset = presets[presetName];
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
				function valueToText(value){
					switch (typeof value){
						case "string":
							return extension.getTranslation(`${settingName}_options.${value}`);
						case "boolean":
							return value? "\u2713": "\u00D7";
						default:
							return value.toString();
					}
				}
				
				const value = preset[settingName];
				const container = document.createElement("li");
				container.textContent = extension.getTranslation(`${settingName}_title`) + ": ";
				if ((typeof value) === "object"){
					const urlValues = document.createElement("ul");
					Object.keys(value).map(function(url){
						var container = document.createElement("li");
						container.className = "urlValue";
						container.textContent = url + ": " +
							valueToText(value[url]) +
							" (" + valueToText(settings.get(settingName, url)) +")";
						return container;
						
					}).forEach(function(node){
						urlValues.appendChild(node);
					});
					container.appendChild(urlValues);
				}
				else {
					container.appendChild(document.createTextNode(
						`${valueToText(value)} (${valueToText(settings.get(settingName))})`
					));
				}
				
				return container;
			}).forEach(function(node){
				settingsList.appendChild(node);
			});
			
			if (settingsList.childNodes.length){
				const button = document.createElement("button");
				button.textContent = extension.getTranslation("apply");
				button.addEventListener("click", function(){
					Promise.all(Object.keys(preset).map(function(settingName){
						const value = preset[settingName];
						if ((typeof value) === "object"){
							return Promise.all(Object.keys(value).map(function(url){
								return settings.set(settingName, value[url], url);
							}));
						}
						else {
							return settings.set(settingName, value);
						}
					})).then(function(){
						window.location.reload();
					});
				});
				container.appendChild(button);
			}
			
			return container;
		}).forEach(function(node){
			document.body.appendChild(node);
		});
	});
	
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
			noticeText.split(/(\{[^}]+\})/).forEach(function(part){
				if (part.startsWith("{") && part.endsWith("}")){
					part = part.substring(1, part.length - 1);
					const args = part.split(":");
					switch (args[0]){
						case "image": {
							const image = document.createElement("img");
							image.className = "noticeImage";
							image.src = args[1];
							notice.appendChild(image);
							break;
						}
						case "link": {
							const link = document.createElement("a");
							link.target = "_blank";
							link.textContent = args[1];
							link.href = args[2];
							notice.appendChild(link);
							break;
						}
					}
				}
				else {
					notice.appendChild(document.createTextNode(part));
				}
			});
			
			head.appendChild(notice);
		}
	}
	
	let introduction = document.createElement("div");
	introduction.textContent = extension.getTranslation("presets_introduction");
	head.appendChild(introduction);
}());