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
		scope = require.register("./modifiedTextMetricsAPI", {});
	}
	
	const {checkerWrapper, setProperties, getStatusByFlag} = require("./modifiedAPIFunctions");
	const {byteArrayToString: hash} = require("./hash");
	const {cache} = require("./modifiedDOMRectAPI");
	const valueCache = cache.valueCache;
	
	function getValueHash(value){
		return hash(new Float32Array([value]));
	}
	
	let randomSupply = null;
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
	};
	
	function getFakeValue(window, value, i, prefs){
		const valueHash = getValueHash(value);
		const cache = valueCache[i];
		let cachedValue = cache[valueHash];
		if (typeof cachedValue === "number"){
			return cachedValue;
		}
		if ((value * prefs("domRectIntegerFactor", window.location)) % 1 === 0){
			cache[valueHash] = value;
			return value;
		}
		else {
			const rng = randomSupply.getRng(5, window);
			const fakedValue = value + 0.01 * (rng(i) / 0xffffffff - 0.5);
			const fakedHash = getValueHash(fakedValue);
			cache[valueHash] = fakedValue;
			cache[fakedHash] = fakedValue;
			return fakedValue;
		}
	}
	
	function generateChangedTextMetricsPropertyGetter(property, cacheIndex){
		const changedGetter = {
			objectGetters: [
				function(window){return window.TextMetrics && window.TextMetrics.prototype;}
			],
			name: property,
			getterGenerator: function(checker){
				const temp = {
					get [property](){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							const originalValue = original.call(this, ...args);
							const returnValue = getFakeValue(window, originalValue, cacheIndex, prefs);
							if (originalValue !== returnValue){
								notify("fakedTextMetricsReadout");
							}
							return returnValue;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, property).get;
			}
		};
		return changedGetter;
	}
	
	scope.changedGetters = [
		generateChangedTextMetricsPropertyGetter("width", cache.WIDTH),
		generateChangedTextMetricsPropertyGetter("actualBoundingBoxAscent", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("actualBoundingBoxDescent", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("actualBoundingBoxLeft", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("actualBoundingBoxRight", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("alphabeticBaseline", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("emHeightAscent", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("emHeightDescent", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("fontBoundingBoxAscent", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("fontBoundingBoxDescent", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("hangingBaseline", cache.OTHER),
		generateChangedTextMetricsPropertyGetter("ideographicBaseline", cache.OTHER),
	];
	
	setProperties({}, scope.changedGetters, {
		type: "readout",
		getStatus: getStatusByFlag("protectTextMetrics"),
		api: "textMetrics"
	});
}());