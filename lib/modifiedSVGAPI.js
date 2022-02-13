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
		scope = require.register("./modifiedSVGAPI", {});
	}
	
	const {checkerWrapper, setProperties, getStatusByFlag} = require("./modifiedAPIFunctions");
	const {byteArrayToString: hash} = require("./hash");
	
	
	let randomSupply = null;
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
	};
	
	function getValueHash(value){
		return hash(new Float32Array([value]));
	}
	
	const cache = {};
	function getFakeValue(value, window){
		const valueHash = getValueHash(value);
		let cachedValue = cache[valueHash];
		if (typeof cachedValue === "number"){
			return cachedValue;
		}
		else {
			const rng = randomSupply.getRng(1, window);
			const fakedValue = value + 0.01 * (rng(0) / 0xffffffff - 0.5);
			const fakedHash = getValueHash(fakedValue);
			cache[valueHash] = fakedValue;
			cache[fakedHash] = fakedValue;
			return fakedValue;
		}
	}
	scope.getFakeValue = getFakeValue;
	
	function getFakeValueCallback(args, check){
		const {notify, window, original} = check;
		const ret = args.length? original.call(this, ...args): original.call(this);
		notify("fakedSVGReadout");
		return getFakeValue(ret, window);
	}
	
	scope.changedFunctions = {
		getTotalLength: {
			object: ["SVGGeometryElement"],
			fakeGenerator: function(checker){
				return function getTotalLength(){
					return checkerWrapper(checker, this, arguments, getFakeValueCallback);
				};
			}
		},
		getComputedTextLength: {
			object: ["SVGTextContentElement"],
			fakeGenerator: function(checker){
				return function getComputedTextLength(){
					return checkerWrapper(checker, this, arguments, getFakeValueCallback);
				};
			}
		},
		getSubStringLength: {
			object: ["SVGTextContentElement"],
			fakeGenerator: function(checker){
				return function getSubStringLength(charnum, nchars){
					return checkerWrapper(checker, this, arguments, getFakeValueCallback);
				};
			}
		},
	};
	
	
	scope.changedGetters = [];
	
	setProperties(scope.changedFunctions, scope.changedGetters, {
		type: "readout",
		getStatus: getStatusByFlag("protectSVG"),
		api: "svg"
	});
}());