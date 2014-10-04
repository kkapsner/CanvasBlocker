(function(){
"use strict";

	function getDomainRegExpList(domainList){
		var list = domainList
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
			
			list.match = function(url){
				return this.some(function(entry){
					return entry.match(url);
				})
			}
			
			return list;
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
		// workers.forEach(checkWorker);
	});

	var blackList;
	function updateBlackList(){
		blackList = getDomainRegExpList(prefs.blackList);
	}
	updateBlackList();
	preferences.on("blackList", function(){
		updateBlackList();
		// workers.forEach(checkWorker);
	});
	
	
	// preferences.on("blockMode", function(){
		// workers.forEach(checkWorker);
	// });
	// preferences.on("allowPDFCanvas", function(){
		// workers.forEach(checkWorker);
	// });

	// var workers = [];
	// function detachWorker(worker, workerArray) {
		// var index = workerArray.indexOf(worker);
		// if (index !== -1){
			// workerArray.splice(index, 1);
		// }
	// }
	function checkWorker(worker){
		var url = new URL(worker.url);
		switch (prefs.blockMode){
			case "blockEverything":
				worker.port.emit("block");
				break;
			case "allowOnlyWhiteList":
				if (whiteList.match(url)){
					worker.port.emit("unblock");
				}
				else {
					worker.port.emit("block");
				}
				break;
			case "askVisible":
				if (whiteList.match(url)){
					worker.port.emit("unblock");
				}
				else if (blackList.match(url)){
					worker.port.emit("block");
				}
				else {
					worker.port.emit("askVisible");
				}
				break;
			case "askInvisible":
				if (whiteList.match(url)){
					worker.port.emit("unblock");
				}
				else if (blackList.match(url)){
					worker.port.emit("block");
				}
				else {
					worker.port.emit("askInvisible");
				}
				break;
			case "blockOnlyBlackList":
				if (blackList.match(url)){
					worker.port.emit("block");
				}
				else {
					worker.port.emit("unblock");
				}
				break;
			case "allowEverything":
				worker.port.emit("unblock");
				break;
			default:
				console.log("Unknown blocking mode.");
		}
	}


	pageMod.PageMod({
		include: "*",
		contentScriptWhen: "start",
		contentScriptFile: self.data.url("inject.js"),
		onAttach: function(worker){
			
			// workers.push(worker);
			// worker.on("detach", function(){
				// detachWorker(this, workers);
			// });
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

}());