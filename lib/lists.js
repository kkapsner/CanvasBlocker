/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */


var preferences = require("sdk/simple-prefs");
var prefService = require("sdk/preferences/service");
var prefs = preferences.prefs;
var sharedFunctions = require("./sharedFunctions");

var lists = {
	white: [],
	ignore: [],
	black: []
};

function updateList(type){
	lists[type] = sharedFunctions.getDomainRegExpList(prefs[type + "List"]);
}
Object.keys(lists).forEach(function(type){
	preferences.on(type + "List", function(){
		updateList(type);
	});
	updateList(type);
});

exports.get = function getList(type){
	return lists[type];
}
exports.appendTo = function appendToList(type, entry){
	prefs[type + "List"] += (prefs[type + "List"]? ",": "") + entry;
	prefService.set("extensions.CanvasBlocker@kkapsner.de.whiteList", prefs[type + "List"]);
	updateList(type);
}
exports.update = updateList;