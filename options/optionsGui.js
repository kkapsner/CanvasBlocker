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
		scope = require.register("./optionsGui", {});
	}
	
	const extension = require("../lib/extension");
	const logging = require("../lib/logging");

	function createDescription(setting){
		const c = document.createElement("div");
		c.className = "content";

		const title = document.createElement("span");
		title.className = "title";
		title.textContent = extension.getTranslation(setting.name + "_title");
		c.appendChild(title);

		let descriptionText = extension.getTranslation(setting.name + "_description");
		if (setting.urlSpecific){
			const urlSpecificDescription = extension.getTranslation(setting.name + "_urlSpecific");
			if (urlSpecificDescription){
				descriptionText += (descriptionText? "\n\n": "") + urlSpecificDescription;
			}
		}
		if (descriptionText){
			const info = document.createElement("div");
			info.className = "info";
			c.appendChild(info);

			const description = document.createElement("div");
			description.className = "description";
			description.textContent = descriptionText;
			info.appendChild(description);
		}
		return c;
	}

	function createSelect(setting){
		const select = document.createElement("select");
		select.dataset.type = typeof setting.defaultValue;
		setting.options.forEach(function(value){
			const option = document.createElement("option");
			if (typeof value === typeof setting.defaultValue){
				option.value = value;
				option.text = extension.getTranslation(setting.name + "_options." + value) || value;
				if (setting.defaultValue === value){
					option.selected = true;
					option.selectedText = option.text;
					option.notSelectedText = option.text + extension.getTranslation("labelForDefaultOption");
				}
			}
			else {
				option.disabled = true;
				option.text = "\u2500".repeat(20);
			}
			select.appendChild(option);
		});
		select.update = function(){
			Array.from(select.options).forEach(function(option){
				if (option.notSelectedText){
					option.text = option.notSelectedText;
				}
			});
			const selectedOption = select.options[select.selectedIndex];
			if (selectedOption.selectedText){
				selectedOption.text = selectedOption.selectedText;
			}
		};
		return select;
	}
	
	const inputTypes = {
		all: {
			updateCallback: function(input, value, defaultValue){
				if (input.update){
					input.update();
				}
				input.classList[value === defaultValue? "remove": "add"]("changed");
			}
		},
		number: {
			input: function(value){
				const input = document.createElement("input");
				input.type = "number";
				input.value = value;
				return input;
			},
			updateCallback: function(input, value, defaultValue){
				input.value = value;
				inputTypes.all.updateCallback(input, value, defaultValue);
				return input.value;
			},
			getValue: function(input){
				return parseFloat(input.value);
			}
		},
		string: {
			input: function(value, setting){
				let input;
				if (setting && setting.display && setting.display.multiline){
					input = document.createElement("textarea");
					input.rows = 1;
				}
				else {
					input = document.createElement("input");
					input.type = "text";
				}
				input.value = value;
				return input;
			},
			updateCallback: function(input, value, defaultValue){
				input.value = value;
				inputTypes.all.updateCallback(input, value, defaultValue);
				return input.value;
			},
			getValue: function(input){
				return input.value;
			}
		},
		boolean: {
			input: function(value){
				const input = document.createElement("input");
				input.type = "checkbox";
				input.checked = value;
				input.style.display = "inline-block";
				return input;
			},
			updateCallback: function(input, value, defaultValue){
				input.checked = value;
				inputTypes.all.updateCallback(input, value, defaultValue);
				return input.checked;
			},
			getValue: function(input){
				return input.checked;
			}
		},
		object: false
	};
	
	function createKeyInput(setting, url){
		const input = document.createElement("table");
		let inSection = false;
		setting.keys.forEach(function(key){
			if (setting.display.displayedSection){
				if (typeof key === "object"){
					if (key.level === 1){
						inSection = key.name === setting.display.displayedSection;
						return;
					}
				}
				if (!inSection){
					return;
				}
			}
			let row = document.createElement("tr");
			if (typeof key === "object"){
				let cell = document.createElement("td");
				cell.colSpan = 2;
				let h = document.createElement("h" + (2 + (key.level || 1)));
				h.textContent = key.message? extension.getTranslation(key.message): key.name;
				cell.appendChild(h);
				row.appendChild(cell);
				input.appendChild(row);
				return;
			}
			
			let nameCell = document.createElement("td");
			nameCell.textContent = setting.display.replaceKeyPattern?
				key.replace(setting.display.replaceKeyPattern, ""):
				key;
			row.appendChild(nameCell);
			
			let keyType = inputTypes[typeof setting.defaultKeyValue];
			let keyInput = keyType.input(setting.defaultKeyValue);
			
			let inputCell = document.createElement("td");
			inputCell.appendChild(keyInput);
			row.appendChild(inputCell);
			
			setting.on(function(){
				const container = setting.get(url);
				keyType.updateCallback(
					keyInput,
					container && container.hasOwnProperty(key)?
						container[key]:
						setting.defaultKeyValue,
					setting.defaultKeyValue
				);
			});
			keyInput.addEventListener("change", function(){
				const value = keyType.getValue(keyInput);
				let container = setting.get(url);
				if (!container){
					container = setting.defaultValue;
				}
				container[key] = value;
				if (setting.set(container, url)){
					logging.message("changed setting", setting.name, "(", key, "):", value);
				}
				else {
					container = setting.get(url);
					keyType.updateCallback(
						keyInput,
						container && container.hasOwnProperty(key)?
							container[key]:
							setting.defaultKeyValue,
						setting.defaultKeyValue
					);
					logging.message("setting", setting.name, "(", key, ") was not changed");
				}
			});
			input.appendChild(row);
		});
		return input;
	}
	
	function getPopulateUrlTable(setting, type, body){
		return function populateUrlTable({newValue}){
			body.innerHTML = "";
			newValue.forEach(function(entry){
				let row = document.createElement("tr");
				let urlCell = document.createElement("td");
				urlCell.classList.add("url");
				urlCell.addEventListener("click", function(){
					const input = document.createElement("input");
					input.classList.add("urlInput");
					input.style.width = urlCell.clientWidth + "px";
					input.style.height = urlCell.clientHeight + "px";
					urlCell.innerHTML = "";
					urlCell.appendChild(input);
					input.title = extension.getTranslation("inputURL");
					input.value = entry.url;
					input.focus();
					input.addEventListener("blur", function(){
						const url = input.value.trim();
						if (url){
							entry.url = url;
							setting.urlContainer.refresh();
						}
						urlCell.removeChild(input);
						urlCell.textContent = entry.url;
					});
					input.addEventListener("click", function(event){
						event.stopPropagation();
					});
				});
				urlCell.textContent = entry.url;
				row.appendChild(urlCell);
				let input = createInput(setting, entry.url);
				type.updateCallback(input, setting.get(entry.url), setting.defaultValue);
				if (!entry.hasOwnProperty(setting.name)){
					input.classList.add("notSpecifiedForUrl");
				}
				let inputCell = document.createElement("td");
				inputCell.appendChild(input);
				row.appendChild(inputCell);
				let clearCell = document.createElement("td");
				let clearButton = document.createElement("button");
				clearButton.className = "reset";
				clearButton.textContent = "\xD7";
				clearButton.addEventListener("click", function(){
					setting.reset(entry.url);
				});
				clearCell.appendChild(clearButton);
				row.appendChild(clearCell);
				body.appendChild(row);
			});
		};
	}
	function createUrlSpecificInput(setting, input, type){
		const container = document.createElement("div");
		container.className = "urlValues " + (setting.getExpand()? "expanded": "collapsed");
		container.appendChild(input);
		const collapser = document.createElement("button");
		collapser.classList.add("collapser");
		container.appendChild(collapser);
		collapser.addEventListener("click", function(){
			setting.setExpand(!setting.getExpand());
		});
		setting.onExpandChange(function(value){
			container.classList[value? "remove": "add"]("collapsed");
			container.classList[value? "add": "remove"]("expanded");
		});
		let urlTable = document.createElement("table");
		let caption = document.createElement("caption");
		caption.textContent = extension.getTranslation(setting.urlContainer.name + "_title");
		urlTable.appendChild(caption);
		let body = document.createElement("tbody");
		urlTable.appendChild(body);
		let foot = document.createElement("tfoot");
		let footRow = document.createElement("tr");
		let footCell = document.createElement("td");
		footCell.colSpan = 3;
		let newInput = document.createElement("input");
		newInput.className = "inputURL";
		newInput.title = extension.getTranslation("inputURL");
		const addURLSetting = function(){
			const url = newInput.value.trim();
			if (url){
				setting.set(setting.get(url), url);
				newInput.value = "";
				newInput.focus();
			}
		};
		newInput.addEventListener("keypress", function(event){
			if ([10, 13].indexOf(event.keyCode) !== -1){
				addURLSetting();
			}
		});
		footCell.appendChild(newInput);
		let footPlus = document.createElement("button");
		footPlus.classList.add("add");
		footPlus.textContent = "+";
		footPlus.addEventListener("click", addURLSetting);
		footCell.appendChild(footPlus);
		footRow.appendChild(footCell);
		foot.appendChild(footRow);
		urlTable.appendChild(foot);
		container.appendChild(urlTable);

		setting.urlContainer.on(getPopulateUrlTable(setting, type, body));
		return container;
	}
	
	function createInput(setting, url = ""){
		const type = inputTypes[typeof setting.defaultValue];
		let input;
		if (setting.options){
			input = createSelect(setting);
		}
		else {
			if (type){
				input = type.input(setting.defaultValue, setting);
			}
		}
		if (type){
			setting.on(function(){
				type.updateCallback(input, setting.get(url), setting.defaultValue);
			}, url);
			input.addEventListener("change", function(){
				const value = type.getValue(input);
				if (setting.set(value, url)){
					type.updateCallback(input, value, setting.defaultValue);
					logging.message("changed setting", setting.name, ":", value);
				}
				else {
					type.updateCallback(input, setting.get(url), setting.defaultValue);
					logging.message("setting", setting.name, "was not changed");
				}
			});
		}
		else if (setting.keys){
			input = createKeyInput(setting, url);
		}
		
		if (setting.urlSpecific && url === ""){
			return createUrlSpecificInput(setting, input, type);
		}
		return input || document.createElement("span");
	}

	function createButton(setting){
		const button = document.createElement("button");
		button.textContent = extension.getTranslation(setting.name + "_label");
		button.addEventListener("click", setting.action);
		return button;
	}

	function createInteraction(setting){
		const c = document.createElement("div");
		c.className = "content";

		let interaction;
		if (setting.action){
			interaction = createButton(setting);
		}
		else if (setting.actions){
			interaction = document.createElement("span");
			setting.actions.forEach(function(action){
				const button = createButton(action);
				interaction.appendChild(button);
			});
		}
		else if (setting.inputs){
			interaction = document.createElement("span");
			setting.inputs.forEach(function(inputSetting){
				const input = createInput(inputSetting);
				input.classList.add("multiple" + setting.inputs.length);
				interaction.appendChild(input);
			});
		}
		else {
			interaction = createInput(setting);
		}

		interaction.classList.add("setting");
		interaction.dataset.storageName = setting.name;
		interaction.dataset.storageType = typeof setting.defaultValue;

		c.appendChild(interaction);
		return c;
	}
	
	function createHide(setting){
		const label = document.createElement("label");
		label.className = "content hideContent";
		label.title = extension.getTranslation("hideSetting");
		const input = document.createElement("input");
		input.type = "checkbox";
		input.className = "hide";
		input.checked = setting.getHide();
		input.addEventListener("change", function(){
			setting.setHide(this.checked);
		});
		setting.onHideChange(function(value){
			input.checked = value;
		});
		
		label.appendChild(input);
		const display = document.createElement("span");
		display.className = "display";
		label.appendChild(display);
		return label;
	}
	
	function createSettingRow(setting){
		const tr = document.createElement("tr");
		tr.className = "settingRow";
		
		const hide = document.createElement("td");
		hide.className = "hideColumn";
		hide.appendChild(createHide(setting));
		tr.appendChild(hide);

		const left = document.createElement("td");
		left.appendChild(createDescription(setting));
		tr.appendChild(left);

		const right = document.createElement("td");
		right.appendChild(createInteraction(setting));
		tr.appendChild(right);

		return tr;
	}

	scope.createSettingRow = createSettingRow;
	
	function createThead(displayHidden, restContent){
		const tHead = document.createElement("thead");
		const searchRow = document.createElement("tr");
		const hideHeadCell = document.createElement("td");
		hideHeadCell.className = "hideColumn";
		searchRow.appendChild(hideHeadCell);
		
		const restHeadCell = document.createElement("td");
		restHeadCell.colSpan = 2;
		if (restContent){
			restHeadCell.appendChild(restContent);
		}
		searchRow.appendChild(restHeadCell);
		tHead.appendChild(searchRow);
		
		const displayHiddenRow = document.createElement("tr");
		displayHiddenRow.className = "settingRow displayHiddenRow";
		displayHiddenRow.appendChild(hideHeadCell.cloneNode());
		const displayHiddenDescription = document.createElement("td");
		displayHiddenDescription.appendChild(createDescription(displayHidden));
		displayHiddenRow.appendChild(displayHiddenDescription);

		const displayHiddenInteraction = document.createElement("td");
		displayHiddenInteraction.appendChild(createInteraction(displayHidden));
		displayHiddenRow.appendChild(displayHiddenInteraction);
		tHead.appendChild(displayHiddenRow);
		return tHead;
	}
	
	scope.createThead = createThead;
}());