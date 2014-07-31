var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
var preferences = require("sdk/simple-prefs");
var prefs = preferences.prefs;
var {URL} = require("sdk/url");
var workers = [];
var whiteList;
updateWhiteList();

function updateWhiteList(){
	whiteList = prefs.whiteList.split(",").map(function(entry){
		return new RegExp("(?:^|\\.)" + entry.replace(/([\\\+\*\?\[\^\]\$\(\)\{\}\=\!\|\.])/g, "\\$1") + "\\.?$", "i");
	});
}

function detachWorker(worker, workerArray) {
	var index = workerArray.indexOf(worker);
	if (index != -1){
		workerArray.splice(index, 1);
	}
}
function checkWorker(worker){
	var url = new URL(worker.url);
	if (prefs.blockAll || !whiteList.some(function(entry){
		return url.hostname.match(entry);
	})){
		worker.port.emit("block");
	}
	else {
		worker.port.emit("unblock");
	}
}

preferences.on("whiteList", function(){
	updateWhiteList();
	workers.forEach(checkWorker);
});
preferences.on("blockAll", function(){
	workers.forEach(checkWorker);
});

pageMod.PageMod({
	include: "*",
	contentScriptWhen: "start",
	contentScriptFile: self.data.url("inject.js"),
	onAttach: function(worker){
		checkWorker(worker);
		
		workers.push(worker);
		worker.on("detach", function(){
			detachWorker(this, workers);
		});
	},
});