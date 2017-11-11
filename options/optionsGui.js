/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = {};
		window.scope.optionsGui = scope;
	}

	const logging = require("./logging");

	function createDescription(setting){
		var c = document.createElement("div");
		c.className = "content";

		var title = document.createElement("span");
		title.className = "title";
		title.textContent = browser.i18n.getMessage(setting.name + "_title");
		c.appendChild(title);

		var descriptionText = browser.i18n.getMessage(setting.name + "_description");
		if (descriptionText){
			var info = document.createElement("div");
			info.className = "info";
			c.appendChild(info);

			var description = document.createElement("div");
			description.className = "description";
			description.textContent = descriptionText;
			info.appendChild(description);
		}
		return c;
	}

	function createSelect(setting){
		var select = document.createElement("select");
		select.dataset.type = typeof setting.defaultValue;
		setting.options.forEach(function(value){
			var option = document.createElement("option");
			if (typeof value === typeof setting.defaultValue){
				option.value = value;
				if (setting.defaultValue === value){
					option.selected = true;
				}
				option.text = browser.i18n.getMessage(setting.name + "_options." + value) || value;
			}
			else {
				option.disabled = true;
				option.text = "\u2500".repeat(20);
			}
			select.appendChild(option);
		});
		return select;
	}
	
	var inputTypes = {
		number: {
			input: function(input, value){
				input.type = "number";
				input.value = value;
				return input;
			},
			updateCallback: function(input, setting){
				input.value = setting.get();
				return input.value;
			},
			changeCallback: function(input, setting){
				setting.set(parseFloat(input.value));
				return parseFloat(input.value);
			}
		},
		string: {
			input: function(input, value){
				input.type = "text";
				input.value = value;
				return input;
			},
			updateCallback: function(input, setting){
				input.value = setting.get();
				return input.value;
			},
			changeCallback: function(input, setting){
				setting.set(input.value);
				return input.value;
			}
		},
		boolean: {
			input: function(input, value){
				input.type = "checkbox";
				input.checked = value;
				input.style.display = "inline";
				return input;
			},
			updateCallback: function(input, setting){
				input.checked = setting.get();
				return input.checked;
			},
			changeCallback: function(input, setting){
				setting.set(input.checked);
				return input.checked;
			}
		}
	};

	function createInput(setting){
		var type = inputTypes[typeof setting.defaultValue];
		var input;
		if (setting.options){
			input = createSelect(setting);
		}
		else {
			input = document.createElement("input");
			if (type){
				type.input(input, setting.defaultValue);
			}
		}
		if (type){
			setting.on(function(){type.updateCallback(input, setting);});
			input.addEventListener("change", function(){
				var value = type.changeCallback(input, setting);
				logging.message("changed setting", setting.name, ":", value);
				
			});
		}
		return input;
	}

	function createButton(setting){
		var button = document.createElement("button");
		button.textContent = browser.i18n.getMessage(setting.name + "_label");
		button.addEventListener("click", setting.action);
		return button;
	}

	function createInteraction(setting){
		var c = document.createElement("div");
		c.className = "content";

		var interaction;
		if (setting.action){
			interaction = createButton(setting);
		}
		else if (setting.inputs){
			interaction = document.createElement("span");
			setting.inputs.forEach(function(inputSetting){
				var input = createInput(inputSetting);
				input.classList.add("multiple" + setting.inputs.length);
				interaction.appendChild(input);
			});
		}
		else {
			interaction = createInput(setting);
		}

		interaction.className = "setting";
		interaction.dataset.storageName = setting.name;
		interaction.dataset.storageType = typeof setting.defaultValue;

		c.appendChild(interaction);
		return c;
	}

	function createSettingRow(setting){
		var tr = document.createElement("tr");
		tr.className = "settingRow";

		var left = document.createElement("td");
		left.appendChild(createDescription(setting));
		tr.appendChild(left);

		var right = document.createElement("td");
		right.appendChild(createInteraction(setting));
		tr.appendChild(right);

		return tr;
	}

	scope.createSettingRow = createSettingRow;
}());