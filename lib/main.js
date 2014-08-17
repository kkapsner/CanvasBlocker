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
			var regExp;
			var domain = !!entry.match(/^[\w.]+$/);
			if (domain){
				regExp = new RegExp("(?:^|\\.)" + entry.replace(/([\\\+\*\?\[\^\]\$\(\)\{\}\=\!\|\.])/g, "\\$1") + "\\.?$", "i")
			}
			else {
				regExp = new RegExp(entry, "i");
			}
			return {
				match: function(url){
					if (domain){
						return url.hostname.match(regExp);
					}
					else {
						return url.href.match(regExp);
					}
				}
			};
		});
}

var self = require("sdk/self");
var pageMod = require("sdk/page-mod");
var preferences = require("sdk/simple-prefs");
var prefs = preferences.prefs;
var {URL} = require("sdk/url");
var _ = require("sdk/l10n").get;

// preferences
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
	updateBlackList();
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
			return entry.match(url);
		});
		if (inBlackList){
			worker.port.emit("block");
		}
		else {
			var inWhiteList = whiteList.some(function(entry){
				return entry.match(url);
			});
			if (inWhiteList){
				worker.port.emit("unblock");
			}
			else {
				if (prefs.askPermission){
					if (prefs.askInvisiblePermission){
						worker.port.emit("askInvisible");
					}
					else {
						worker.port.emit("ask");
					}
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
		prefs.askInsiviblePermission = false;
	}
	workers.forEach(checkWorker);
});
preferences.on("askPermission", function(){
	if (prefs.askPermission){
		prefs.blockAll = false;
	}
	else {
		prefs.askInvisiblePermission = false;
	}
	workers.forEach(checkWorker);
});
preferences.on("askInvisiblePermission", function(){
	if (prefs.askInvisiblePermission){
		prefs.askPermission = true;
		prefs.blockAll = false;
	}
	workers.forEach(checkWorker);
});
preferences.on("allowPDFCanvas", function(){
	workers.forEach(checkWorker);
});


pageMod.PageMod({
	include: "*",
	contentScriptWhen: "start",
	contentScriptFile: self.data.url("inject.js"),
	onAttach: function(worker){
		
		workers.push(worker);
		worker.on("detach", function(){
			detachWorker(this, workers);
		});
		worker.port.on("getTranslation", function(name){
			worker.port.emit("setTranslation", name, _.apply(null, arguments));
		});
		worker.port.on("isPDF", function(blocking){
			if (prefs.allowPDFCanvas){
				worker.port.emit("unblock");
			}
			else {
				worker.port.emit(blocking, true);
			}
		});
		worker.port.emit("setTranslation", "askForPermission", _("askForPermission"));
		worker.port.emit("setTranslation", "askForInvisiblePermission", _("askForInvisiblePermission"));
		checkWorker(worker);
	},
});