/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const extension = require("../lib/extension");
	const settings = require("../lib/settings");
	require("../lib/theme").init("sanitize");
	const sanitationRules = require("./sanitationRules");
	
	const title = document.createElement("h1");
	title.className = "title";
	title.textContent = extension.getTranslation("sanitation_title");
	document.body.appendChild(title);
	
	const description = document.createElement("div");
	description.className = "description";
	description.textContent = extension.getTranslation("sanitation_description");
	document.body.appendChild(description);
	
	settings.onloaded(function(){
		const list = document.createElement("ul");
		sanitationRules.ruleset.forEach(function(ruleset){
			const rulesetContainer = document.createElement("li");
			rulesetContainer.textContent = extension.getTranslation("sanitation_ruleset." + ruleset.name);
			
			const rulesetErrors = document.createElement("ul");
			let anyComplaint = false;
			ruleset.check(function({message, severity, resolutions}){
				anyComplaint = true;
				const li = document.createElement("li");
				li.className = "complaint " + severity;
				li.textContent = message;
				
				const buttons = document.createElement("span");
				buttons.className = "resolutions";
				resolutions.forEach(function(resolution){
					const button = document.createElement("button");
					button.textContent = resolution.label;
					button.addEventListener("click", function(){
						resolution.callback();
						window.location.reload();
					});
					buttons.appendChild(button);
				});
				li.appendChild(buttons);
				rulesetErrors.appendChild(li);
			});
			if (!anyComplaint){
				const noComplaints = document.createElement("li");
				noComplaints.className = "noComplaints";
				noComplaints.textContent = extension.getTranslation("sanitation_nothingToComplain");
				rulesetErrors.appendChild(noComplaints);
			}
			rulesetContainer.appendChild(rulesetErrors);
			list.appendChild(rulesetContainer);
		});
		document.body.appendChild(list);
	});
}());