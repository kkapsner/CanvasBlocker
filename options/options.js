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
		inspectSettings: function(){
			logging.verbose("open settings inspection");
			window.open("export.html", "_blank");
		},
		saveSettings: function(){
			logging.verbose("save settings");
			const data = {};
			settings.forEach(function(def){
				data[def.name] = def.get();
			});
			const blob = new Blob([JSON.stringify(data, null, "\t")], {type: "application/json"});
			const link = document.createElement("a");
			link.href = window.URL.createObjectURL(blob);
			link.target = "_blank";
			link.download = "CanvasBlocker-settings.json";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		},
		loadSettings: function(){
			logging.verbose("load settings");
			new Promise(function(resolve, reject){
				const input = document.createElement("input");
				input.type = "file";
				input.addEventListener("change", function(){
					if (this.files.length){
						var file = this.files[0];
						var reader = new FileReader();
						reader.onload = function(result){
							resolve(this.result);
						};
						reader.onerror = function(err){
							reject(err);
						};
						reader.readAsText(this.files[0]);
					}
				});
				input.click();
			}).then(function(text){
				return JSON.parse(text);
			}).then(function(json){
				const keys = Object.keys(json);
				keys.forEach(function(key){
					const setting = settings.getDefinition(key);
					if (!settings){
						throw new Error("Unknown setting " + key + ".");
					}
					if (!setting.fixed && setting.invalid(json[key])){
						throw new Error("Invalid value " + json[key] + " for " + key + ".");
					}
				});
				keys.forEach(function(key){
					settings[key] = json[key];
				});
			}).catch(function(err){
				alert(err);
			});
		},
		resetSettings: function(){
			if (window.confirm(browser.i18n.getMessage("resetSettings_confirm"))){
				browser.storage.local.clear();
			}
		}
	};
	
	new Promise(function(resolve){
		const port = browser.runtime.connect();
		port.onMessage.addListener(function(data){
			if (data.hasOwnProperty("tabId")){
				logging.notice("my tab id is", data.tabId);
				port.disconnect();
				resolve(data.tabId);
			}
		});
	}).then(function(tabId){
		return browser.tabs.get(tabId);
	}).then(function(tab){
		let head = document.createElement("header");
		document.body.insertBefore(head, document.body.firstChild);
		
		if (tab.url === window.location.href){
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
					
					const dontShowAgain = document.createElement("label");
					dontShowAgain.className = "dontShowOptionsOnUpdate";
					const dontShowAgainInput = document.createElement("input");
					dontShowAgainInput.type = "checkbox";
					settings.onloaded(function(){
						dontShowAgainInput.checked = settings.dontShowOptionsOnUpdate;
					});
					dontShowAgainInput.addEventListener("change", function(){
						settings.dontShowOptionsOnUpdate = this.checked;
					});
					dontShowAgain.appendChild(dontShowAgainInput);
					dontShowAgain.appendChild(
						document.createTextNode(
							browser.i18n.getMessage("dontShowOptionsOnUpdate")
						)
					);
					bookmarkingNotice.appendChild(dontShowAgain);
					
					head.appendChild(bookmarkingNotice);
					
					const newUrl = new URL(window.location.href);
					newUrl.search = "";
					window.history.pushState({}, "", newUrl.href);
				}
			}
			
			document.body.classList.add("standalone");
		}
		else {
			const linkDiv = document.createElement("div");
			linkDiv.className = "optionsLink";
			const link = document.createElement("a");
			link.href = window.location.href;
			link.target = "_blank";
			link.textContent = browser.i18n.getMessage("openInTab");
			linkDiv.appendChild(link);
			head.appendChild(linkDiv);
		}
	});
	
	var table = document.createElement("table");
	table.className = "settings " + (settings.displayDescriptions? "display": "hide") + "Descriptions";
	settings.on("displayDescriptions", function(){
		table.className = "settings " + (settings.displayDescriptions? "display": "hide") + "Descriptions";
	});
	document.body.appendChild(table);
	
	const displayHidden = settings.getDefinition(settingsDisplay.displayHidden);
	table.appendChild(optionsGui.createThead(displayHidden));
	
	let lastSection = null;
	let addSection = function addSection(name){
		let body = document.createElement("tbody");
		if (name){
			let row = document.createElement("tr");
			row.className = "section";
			let cell = document.createElement("td");
			cell.colSpan = 3;
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
	
	const {hide: hideContainer} = settings.getContainers();
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
				else if (display.actions){
					setting = {
						name: display.name,
						actions: display.actions.map(function(action){
							return {
								name: action,
								action: callbacks[action]
							};
						}).filter(function(action){
							return action.action;
						})
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
				let hideChangeListeners = [];
				setting.setHide = function setHide(value){
					if (hideContainer){
						hideContainer.setHideByName(display.name, value);
						if (computeDependencies){
							computeDependencies();
						}
					}
				};
				setting.onHideChange = function(listener){
					hideChangeListeners.push(listener);
				};
				setting.getHide = function getHide(){
					if (hideContainer){
						return hideContainer.getHideByName(display.name);
					}
					else {
						return false;
					}
				};
				if (hideContainer){
					hideContainer.onHideChange(display.name, function(value){
						if (computeDependencies){
							computeDependencies();
						}
						hideChangeListeners.forEach(function(listener){
							listener(value);
						});
					});
				}
				
				var row = optionsGui.createSettingRow(setting);
				let section = lastSection;
				section.addRow(row);
				if (!display.displayDependencies){
					display.displayDependencies = {};
				}
				var displayDependencies = display.displayDependencies;
				displayDependencies = Array.isArray(displayDependencies)?
					displayDependencies:
					[displayDependencies];
				var computeDependencies = function(){
					logging.verbose("evaluate display dependencies for", setting);
					row.classList[(
						(
							displayHidden.get() ||
							!setting.getHide()
						) &&
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
				displayHidden.on(computeDependencies);
			}
		}
	});
	
	const version = document.createElement("div");
	version.className = "version";
	fetch(browser.extension.getURL("manifest.json")).then(function(response){
		return response.json();
	}).then(function(manifest){
		version.textContent = "Version " + manifest.version;
	});
	document.body.appendChild(version);
	
	settings.onloaded(function(){
		const reCaptchaEntry = "^https://www\\.google\\.com/recaptcha/api2/(?:b?frame|anchor).*$";
		const {url: urlContainer} = settings.getContainers();
		settings.on("protectWindow", function({newValue}){
			if (newValue){
				const urlValue = urlContainer.get();
				const matching = urlValue.filter(function(entry){
					return entry.url === reCaptchaEntry;
				});
				if (
					newValue &&
					(
						matching.length === 0 ||
						matching[0].protectWindow
					) &&
					window.confirm(browser.i18n.getMessage("protectWindow_askReCaptchaException"))
				){
					settings.set("protectWindow", false, reCaptchaEntry);
				}
			}
		});
	});
}());
