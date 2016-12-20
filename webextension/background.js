console.log("background");
browser.tabs.query({}).then(function(tabs){
	console.log("tabs", tabs);
	tabs.forEach(function(tab){
		console.log("tab", tab);
		browser.pageAction.show(tab.id).then(function(){console.log("success");}, function(){console.log("error");});
	});
});

browser.tabs.onActivated.addListener(function(tab){
	browser.pageAction.show(tab.id);
});
browser.tabs.onUpdate.addistener(function(tab){
	browser.pageAction.show(tab.id);
});
	