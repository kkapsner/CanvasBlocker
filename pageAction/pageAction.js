// console.log(window, browser, browser.runtime);
function modalPrompt(message, defaultValue){
	return new Promise(function(resolve, reject){
		document.body.innerHTML = "";
		document.body.appendChild(document.createTextNode(message));
		var input = document.createElement("input");
		input.value = defaultValue;
		document.body.appendChild(input);
		var button = document.createElement("button");
		button.textContent = "OK";
		button.addEventListener("click", function(){
			resolve(input.value);
		});
		document.body.appendChild(button);
	});
}

Promise.all([
	browser.tabs.query({active: true, currentWindow: true}),
	browser.storage.local.get().then(function(data){
		Object.keys(data).forEach(function(key){
			settings[key] = data[key];
		});
		return settings;
	})
]).then(function([tabs, settings]){
	if (!tabs.length){
		throw new Error("noTabsFound");
	}
	else if (tabs.length > 1){
		console.error(tabs);
		throw new Error("tooManyTabsFound");
	}
	
	const lists = require("./lists");
	const {parseErrorStack} = require("./callingStack");
	var actionsCallbacks = {
		displayFullURL: function({url}){
			alert(url.href);
		},
		displayCallingStack: function({errorStack}){
			alert(parseErrorStack(errorStack));
		},
		ignorelistDomain: function({url}){
			var domain = url.host;
			modalPrompt(
				browser.i18n.getMessage("inputIgnoreDomain"),
				url.host
			).then(function(domain){
				if (domain){
					lists.appendTo("ignore", domain);
				}
				window.close();
			});
		},
		whitelistURL: function({url}){
			modalPrompt(
				browser.i18n.getMessage("inputWhitelistDomain"),
				"^" + url.href.replace(/([\\\+\*\?\[\^\]\$\(\)\{\}\=\!\|\.])/g, "\\$1") + "$"
			).then(function(url){
				if (url){
					lists.appendTo("white", url);
				}
				window.close();
			});
		},
		whitelistDomain: function({url}){
			modalPrompt(
				browser.i18n.getMessage("inputWhitelistURL"),
				url.host
			).then(function(domain){
				if (domain){
					lists.appendTo("white", domain);
				}
				window.close();
			});
		},
		disableNotifications: function(notification){
			browser.storage.local.set({showNotifications: false});
			window.close();
		},
		
	};
	
	var tab = tabs[0];
	browser.runtime.onMessage.addListener(function(data){
		if (Array.isArray(data["canvasBlocker-notifications"])){
			var ul = document.getElementById("prints");
			ul.innerHTML = "";
			data["canvasBlocker-notifications"].forEach(function(notification){
				console.log(notification);
				
				var url = new URL(notification.url);
				var li = document.createElement("li");
				li.className = "print";
				
				
				li.appendChild(document.createTextNode(" "));
				
				var messageSpan = document.createElement("span");
				var messageParts = browser.i18n.getMessage(notification.messageId).split(/\{url\}/g);
				messageSpan.appendChild(document.createTextNode(messageParts.shift()));
				while (messageParts.length){
					var urlSpan = document.createElement("span");
					urlSpan.textContent = url.hostname;
					urlSpan.title = url.href;
					messageSpan.appendChild(urlSpan);
					messageSpan.appendChild(document.createTextNode(messageParts.shift()));
				}
				messageSpan.title = notification.timestamp + ": " + notification.functionName;
				li.appendChild(messageSpan);
				
				li.appendChild(document.createTextNode(" "));
				
				var actions = document.createElement("span");
				actions.className = "actions";
				var data = {url, errorStack: notification.errorStack, notification};
				Object.keys(actionsCallbacks).forEach(function(key){
					var button = document.createElement("button");
					button.textContent = browser.i18n.getMessage(key);
					button.addEventListener("click", function(){actionsCallbacks[key](data);});
					actions.appendChild(button);
				});
				li.appendChild(actions);
				
				ul.appendChild(li);
			});
		}
	});
	browser.tabs.sendMessage(
		tab.id,
		{
			"canvasBlocker-sendNotifications": tab.id
		}
	);
}).catch(function(e){
	console.error(e);
});