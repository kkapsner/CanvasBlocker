/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./modifiedAPI", {});
	}
	
	const randomSupplyCallbacks = [];
	scope.setRandomSupply = function(supply){
		randomSupplyCallbacks.forEach(function(callback){
			callback(supply);
		});
	};
	scope.changedFunctions = {};
	
	scope.changedGetters = [];
	
	function appendModified(collection){
		if (collection.setRandomSupply){
			randomSupplyCallbacks.push(collection.setRandomSupply);
		}
		Object.keys(collection.changedFunctions || {}).forEach(function(key){
			scope.changedFunctions[key] = collection.changedFunctions[key];
		});
		
		(collection.changedGetters || []).forEach(function(changedGetter){
			scope.changedGetters.push(changedGetter);
		});
	}
	appendModified(require("./modifiedCanvasAPI"));
	appendModified(require("./modifiedAudioAPI"));
	appendModified(require("./modifiedHistoryAPI"));
	appendModified(require("./modifiedWindowAPI"));
	appendModified(require("./modifiedDOMRectAPI"));
	appendModified(require("./modifiedSVGAPI"));
	appendModified(require("./modifiedTextMetricsAPI"));
	appendModified(require("./modifiedNavigatorAPI"));
	appendModified(require("./modifiedScreenAPI"));
}());