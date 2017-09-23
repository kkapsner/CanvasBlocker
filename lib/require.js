window.scope = {};
function require(module){
	if (module.startsWith("./")){
		var scopeName = module.substr(2).replace(/\..+/, "");
		return window.scope[scopeName];
	}
	else if (module === "chrome"){
		return {
			Cu: {exportFunction}
		};
	}
	else if (module === "sdk/simple-prefs"){
		return {
			prefs: settings,
			on: function(key, callback){
				browser.storage.onChanged.addListener(function(changes, area){
					if (area === "local"){
						if (changes.hasOwnProperty(key)){
							callback(changes[key].newValue);
						}
					}
				});
			}
		}
	}
	else if (module === "sdk/l10n"){
		return {
			get: function(key){
				return browser.i18n.getMessage(key);
			}
		}
	}
	else if (module === "sdk/url"){
		return {
			URL
		}
	}
	console.error("Not able to get non relative modules!", module);
	return undefined;
}

window.scope.require = require;