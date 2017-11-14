/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	const settings = require("./settings");
	const logging = require("./logging");
	const input = document.getElementById("settings");
	settings.onloaded(function(){
		var data = {};
		settings.forEach(function(def){
			data[def.name] = def.get();
		});
		input.value = JSON.stringify(data, null, "\t");

		input.addEventListener("input", function(){
			try {
				var newSettings = JSON.parse(this.value);
				var isValid = true;

				
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
			catch (e){
				logging.warning("Invalid JSON:", e);
				this.classList.add("invalid");
			}
		});
	});
}());