function getDomainRegExpList(domainList){
	return domainList
		.split(",")
		.map(function(entry){
			return entry.replace(/^\s+|\s+$/g, "");
		})
		.filter(function(entry){
			return !!entry.length;
		})
		.map(function(entry){
			return new RegExp("(?:^|\\.)" + entry.replace(/([\\\+\*\?\[\^\]\$\(\)\{\}\=\!\|\.])/g, "\\$1") + "\\.?$", "i");
		});
}

var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
var preferences = require("sdk/simple-prefs");
var prefs = preferences.prefs;
var {URL} = require("sdk/url");

var whiteList;
function updateWhiteList(){
	whiteList = getDomainRegExpList(prefs.whiteList);
}
updateWhiteList();
preferences.on("whiteList", function(){
	updateWhiteList();
	workers.forEach(checkWorker);
});

var blackList;
function updateBlackList(){
	blackList = getDomainRegExpList(prefs.blackList);
}
updateBlackList();
preferences.on("blackList", function(){
	updateBackList();
	workers.forEach(checkWorker);
});

var workers = [];
function detachWorker(worker, workerArray) {
	var index = workerArray.indexOf(worker);
	if (index != -1){
		workerArray.splice(index, 1);
	}
}
function checkWorker(worker){
	if (prefs.blockAll){
		worker.port.emit("block");
	}
	else {
		var url = new URL(worker.url);
		var inBlackList = blackList.some(function(entry){
			return url.hostname.match(entry);
		});
		if (inBlackList){
			worker.port.emit("block");
		}
		else {
			var inWhiteList = whiteList.some(function(entry){
				return url.hostname.match(entry);
			});
			if (inWhiteList){
				worker.port.emit("unblock");
			}
			else {
				if (prefs.askPermission){
					worker.port.emit("ask");
				}
				else {
					worker.port.emit("block");
				}
			}
		}
	}
}

preferences.on("blockAll", function(){
	if (prefs.blockAll){
		prefs.askPermission = false;
	}
	workers.forEach(checkWorker);
});
preferences.on("askPermission", function(){
	if (prefs.askPermission){
		prefs.blockAll = false;
	}
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