(function(){
	function traverse(node, func){
		func(node);
		Array.from(node.childNodes).forEach(function(child){traverse(child, func);});
	}
	
	// getting the translation of all the messages
	traverse(document.body, function(node){
		if (node.nodeType == 3){
			node.nodeValue = node.nodeValue.replace(/\b__MSG_(.+)__\b/g, function(m, key){
				try {
					return browser.i18n.getMessage(key);
				}
				catch (e){
					return "Unknown i18n key: " + key;
				}
			});
		}
	});
	
	Array.from(document.querySelectorAll("input.setting, select.setting")).forEach(function(input){
		var storageName = input.dataset.storageName;
		if (input.type === "checkbox"){
			browser.storage.local.get(storageName).then(function(value){
				// console.log(storageName, "got storage value", value);
				if (value.hasOwnProperty(storageName)){
					input.checked = value[storageName];
				}
			});
			
			input.addEventListener("click", function(){
				var value = this.checked;
				var obj = {};
				obj[storageName] = value;
				browser.storage.local.set(obj);
			});}
		else {
			browser.storage.local.get(storageName).then(function(value){
				// console.log(storageName, "got storage value", value);
				if (value.hasOwnProperty(storageName)){
					input.value = value[storageName];
				}
			});
			
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
	
	browser.storage.onChanged.addListener(function(change, area){
		if (area === "local"){
			Object.keys(change).forEach(function(key){
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
		}
	});
}());	