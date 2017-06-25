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
		browser.storage.local.get(storageName).then(function(value){
			// console.log(storageName, "got storage value", value);
			if (value.hasOwnProperty(storageName)){
				input.value = value[storageName];
			}
		});
		
		input.addEventListener("change", function(){
			var value;
			if (this.type === "checkbox"){
				value = this.checked;
			}
			else {
				value = this.value;
			}
			var obj = {};
			obj[storageName] = value;
			browser.storage.local.set(obj);
		});
	});
	
	var callbacks = {
		showReleaseNotes: function(){
			console.log("sdsdsdsd");
			window.open("../releaseNotes.txt", "_blank");
		},
		clearPersistentRnd: function(){
			browser.runtime.sendMessage({"canvasBlocker-clear-domain-rnd": true});
			browser.storage.local.set({persistentRndStorage: ""});
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
	
	browser.storage.onChanged.addListener(function(data){
		Object.keys(data).forEach(function(storageName){
			
		});
	});
}());	