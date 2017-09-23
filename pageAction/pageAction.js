/* jslint moz: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

Promise.all([
	browser.tabs.query({active: true, currentWindow: true}),
	browser.storage.local.get().then(function(data){
		Object.keys(data).forEach(function(key){
			settings[key] = data[key];
		});
		return settings;
	})
]).then(function(values){
	"use strict";
	const [tabs, settings] = values;
	
	const {error, warning, message, notice, verbose, setPrefix: setLogPrefix} = require("./logging");
	setLogPrefix("page action script");
	
	function modalPrompt(messageText, defaultValue){
		message("open modal prompt");
		return new Promise(function(resolve, reject){
			document.body.innerHTML = "";
			document.body.appendChild(document.createTextNode(messageText));
			var input = document.createElement("input");
			input.value = defaultValue;
			document.body.appendChild(input);
			var button = document.createElement("button");
			button.textContent = "OK";
			button.addEventListener("click", function(){
				resolve(input.value);
				message("modal prompt closed with value", input.value);
			});
			document.body.appendChild(button);
		});
	}
	
	if (!tabs.length){
		throw new Error("noTabsFound");
	}
	else if (tabs.length > 1){
		console.error(tabs);
		throw new Error("tooManyTabsFound");
	}
	
	const lists = require("./lists");
	lists.updateAll();
	const {parseErrorStack} = require("./callingStack");
	var actionsCallbacks = {
		displayFullURL: function({url}){
			alert(url.href);
		},
		displayCallingStack: function({errorStack}){
			alert(parseErrorStack(errorStack));
		},
		inspectImage:  function({dataURL}){
			document.body.innerHTML = "";
			var img = document.createElement("img");
			img.src = dataURL;
			document.body.appendChild(img);
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
			message("got notifications");
			var ul = document.getElementById("prints");
			data["canvasBlocker-notifications"].forEach(function(notification){
				verbose(notification);
				
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
				var data = {url, errorStack: notification.errorStack, notification, dataURL: notification.dataURL};
				Object.keys(actionsCallbacks).forEach(function(key, i){
					var button = document.createElement("button");
					button.className = key;
					button.textContent = browser.i18n.getMessage(key);
					button.addEventListener("click", function(){actionsCallbacks[key](data);});
					actions.appendChild(button);
					if (i % 3 === 2){
						actions.appendChild(document.createElement("br"));
					}
				});
				if (notification.dataURL){
					actions.classList.add("imageAvailable");
				}
				li.appendChild(actions);
				
				ul.appendChild(li);
			});
		}
	});
	notice("clearing the display");
	var ul = document.getElementById("prints");
	ul.innerHTML = "";
	message("request notifications from tab", tab.id);
	browser.tabs.sendMessage(
		tab.id,
		{
			"canvasBlocker-sendNotifications": tab.id
		}
	);
	notice("waiting for notifications");
}).catch(function(e){
	console.error(e);
});