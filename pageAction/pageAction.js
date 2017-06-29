// console.log(window, browser, browser.runtime);
browser.tabs.query({active: true, currentWindow: true}).then(function(tabs){
	if (!tabs.length){
		throw new Error("noTabsFound");
	}
	var tab = tabs[0];
	browser.runtime.onMessage.addListener(function(data){
		if (Array.isArray(data["canvasBlocker-notifications"])){
			var ul = document.getElementById("prints");
			data["canvasBlocker-notifications"].forEach(function(notification){
				var li = document.createElement("li");
				li.className = "print";
				li.textContent = notification.url + ": " + notification.messageId + " (" + notification.timestamp + ")" + "\n" + notification.errorStack;
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