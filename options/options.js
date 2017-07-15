browser.storage.local.get().then(function(data){
	Object.keys(data).forEach(function(key){
		settings[key] = data[key];
	});
	return settings;
}).then(function(settings){
	function traverse(node, func){
		func(node);
		Array.from(node.childNodes).forEach(function(child){traverse(child, func);});
	}
	
	// getting the translation of all the messages
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
	
	Array.from(document.querySelectorAll("input.setting, select.setting")).forEach(function(input){
		var storageName = input.dataset.storageName;
		if (input.type === "checkbox"){
			input.checked = settings[storageName];
			
			input.addEventListener("click", function(){
				var value = this.checked;
				var obj = {};
				obj[storageName] = value;
				browser.storage.local.set(obj);
			});}
		else {
			input.value = settings[storageName];
			
			input.addEventListener("change", function(){
				var value = this.value;
				var obj = {};
				obj[storageName] = value;
				browser.storage.local.set(obj);
			});
		}
	});
	
	var callbacks = {
		showReleaseNotes: function(){
			window.open("../releaseNotes.txt", "_blank");
			// would be nicer but is not supported in fennec
			// browser.windows.create({
				// url: "../releaseNotes.txt",
				// type: "popup"
			// });
		},
		clearPersistentRnd: function(){
			browser.storage.local.set({persistentRndStorage: ""});
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
		document.querySelectorAll("tr.settingRow").forEach(function(row){
			var displayDependencies = row.setting.displayDependencies;
			if (displayDependencies){
				row.classList[(
					(Array.isArray(displayDependencies)? displayDependencies: [displayDependencies]).some(function(displayDependency){
						return Object.keys(displayDependency).every(function(key){
							console.log(key, displayDependency[key], settings[key]);
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