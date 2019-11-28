/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	const settings = require("../lib/settings");
	const logging = require("../lib/logging");
	const settingsMigration = require("../lib/settingsMigration");
	require("../lib/theme").init();
	const input = document.getElementById("settings");
	settings.onloaded(function(){
		const data = {};
		settings.forEach(function(def){
			data[def.name] = def.get();
		});
		input.value = JSON.stringify(data, null, "\t");

		input.addEventListener("input", function(){
			try {
				let newSettings = JSON.parse(this.value);
				let isValid = true;
				
				while (settingsMigration.transitions.hasOwnProperty(newSettings.storageVersion)){
					let oldVersion = newSettings.storageVersion;
					newSettings = settingsMigration.transitions[newSettings.storageVersion](newSettings);
					if (oldVersion === newSettings.storageVersion){
						break;
					}
				}
				
				Object.entries(newSettings).forEach(function(entry){
					const [name, value] = entry;
					const def = settings.getDefinition(name);
					if (!def){
						logging.warning("Setting %s not known.");
						isValid = false;
					}
					else if (def.get() !== value){
						const invalid = def.invalid(value);
						if (invalid){
							isValid = false;
							logging.warning("Invalid setting for %s:", name, value, invalid);
						}
					}
				});
				if (isValid){
					this.classList.remove("invalid");
					Object.entries(newSettings).forEach(function(entry){
						const [name, value] = entry;
						if (settings[name] !== value){
							settings[name] = value;
						}
					});
				}
				else {
					this.classList.add("invalid");
				}
			}
			catch (error){
				logging.warning("Invalid JSON:", error);
				this.classList.add("invalid");
			}
		});
		input.addEventListener("blur", function(){
			if (!this.classList.contains("invalid")){
				const data = {};
				settings.forEach(function(def){
					data[def.name] = def.get();
				});
				input.value = JSON.stringify(data, null, "\t");
			}
		});
	});
}());