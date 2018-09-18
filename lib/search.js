/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		window.scope.search = {};
		scope = window.scope.search;
	}
	
	const texts = [];
	
	scope.register = function(text, content){
		texts.push({text: text.toLowerCase(), content});
	};
	scope.search = function(search){
		search = search.toLowerCase();
		const result = [];
		texts.forEach(function(text){
			if (text.text.indexOf(search) !== -1){
				result.push(text.content);
			}
		});
		return result;
	};
	const searchListeners = [];
	scope.init = function(){
		const node = document.createElement("input");
		node.id = "search";
		node.placeholder = browser.i18n.getMessage("search");
		window.setTimeout(() => node.focus(), 1);
		let lastResults = [];
		node.addEventListener("input", function(){
			const search = this.value;
			const results = search? scope.search(search): [];
			searchListeners.forEach(function(callback){
				callback({search, results, lastResults});
			});
			lastResults = results;
		});
		return node;
	};
	scope.on = function(callback){
		searchListeners.push(callback);
	};
}());