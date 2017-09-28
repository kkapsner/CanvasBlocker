/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
browser.storage.local.get().then(function(data){
	Object.keys(data).forEach(function(key){
		settings[key] = data[key];
	});
	settings.isStillDefault = false;
	logging.setPrefix("options page");
	logging.clearQueue();
	return settings;
}).then(function(settings){
	function traverse(node, func){
		func(node);
		Array.from(node.childNodes).forEach(function(child){traverse(child, func);});
	}
	
	// getting the translation of all the messages
	logging.message("transate all messages");
	traverse(document.body, function(node){
		if (node.nodeType == 3){
			var lines = node.nodeValue.replace(/\b__MSG_(.+)__\b/g, function(m, key){
				try {
					return browser.i18n.getMessage(key);
				}
				catch (e){
					return "Unknown i18n key: " + key;
				}
			}).split(/\n/g);
			node.nodeValue = lines.shift();
			lines.forEach(function(line){
				node.parentNode.appendChild(document.createElement("br"));
				node.parentNode.appendChild(document.createTextNode(line));
			});
		}
	});
	
	logging.message("register events to store changes in local storage");
	Array.from(document.querySelectorAll("input.setting, select.setting")).forEach(function(input){
		var storageName = input.dataset.storageName;
		if (input.type === "checkbox"){
			input.checked = settings[storageName];
			
			input.addEventListener("click", function(){
				logging.message("changed setting", storageName, ":", this.checked);
				var value = this.checked;
				var obj = {};
				obj[storageName] = value;
				browser.storage.local.set(obj);
			});}
		else {
			input.value = settings[storageName];
			
			input.addEventListener("change", function(){
				var value = this.value;
				if (this.type === "number" || this.dataset.type === "number"){
					value = parseFloat(value);
				}
				logging.message("changed setting", storageName, ":", value);
				var obj = {};
				obj[storageName] = value;
				browser.storage.local.set(obj);
			});
		}
	});
	
	var callbacks = {
		showReleaseNotes: function(){
			logging.verbose("open release notes");
			window.open("../releaseNotes.txt", "_blank");
			// would be nicer but is not supported in fennec
			// browser.windows.create({
				// url: "../releaseNotes.txt",
				// type: "popup"
			// });
		},
		clearPersistentRnd: function(){
			logging.message("clear persistent rnd storage");
			logging.notice("empty storage");
			browser.storage.local.set({persistentRndStorage: ""});
			logging.notice("send message to main script");
			browser.runtime.sendMessage({"canvasBlocker-clear-domain-rnd": true});
		}
	};
	Array.from(document.querySelectorAll("button.setting")).forEach(function(button){
		var storageName = button.dataset.storageName;
		button.addEventListener("click", function(){
			if (callbacks[storageName]){
				callbacks[storageName]();
			}
		});
	});
	
	function updateDisplay(){
		logging.notice("update display");
		document.querySelectorAll("tr.settingRow").forEach(function(row){
			logging.verbose("evaluate display dependencies for", row.setting);
			var displayDependencies = row.setting.displayDependencies;
			if (displayDependencies){
				row.classList[(
					(Array.isArray(displayDependencies)? displayDependencies: [displayDependencies]).some(function(displayDependency){
						return Object.keys(displayDependency).every(function(key){
							return displayDependency[key].indexOf(settings[key]) !== -1;
						});
					})
				)? "remove": "add"]("hidden");
			}
		});
	}
	updateDisplay();
	
	browser.storage.onChanged.addListener(function(change, area){
		if (area === "local"){
			Object.keys(change).forEach(function(key){
				settings[key] = change[key].newValue;
				var input = document.querySelector(".setting[data-storage-name=" + key + "]");
				if (input){
					if (input.type === "checkbox"){
						input.checked = change[key].newValue;
					}
					else {
						input.value = change[key].newValue;
					}
				}
			});
			updateDisplay();
		}
	});
});	