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
		scope = require.register("./modifiedScreenAPI", {});
	}
	
	const {checkerWrapper, setGetterProperties, getStatusByFlag} = require("./modifiedAPIFunctions");
	
	const physical = {
		width: Math.round(window.screen.width * window.devicePixelRatio),
		height: Math.round(window.screen.height * window.devicePixelRatio)
	};
	if (!window.matchMedia(`(device-width: ${physical.width / window.devicePixelRatio}px`).matches){
		let minWidth = Math.ceil((window.screen.width - 0.5) * window.devicePixelRatio);
		let maxWidth = Math.floor((window.screen.width + 0.5) * window.devicePixelRatio);
		for (let width = minWidth; width <= maxWidth; width += 1){
			if (window.matchMedia(`(device-width: ${width / window.devicePixelRatio}px`).matches){
				physical.width = width;
				break;
			}
		}
	}
	if (!window.matchMedia(`(device-height: ${physical.height / window.devicePixelRatio}px`).matches){
		let minHeight = Math.ceil((window.screen.height - 0.5) * window.devicePixelRatio);
		let maxHeight = Math.floor((window.screen.height + 0.5) * window.devicePixelRatio);
		for (let height = minHeight; height <= maxHeight; height += 1){
			if (window.matchMedia(`(device-height: ${height / window.devicePixelRatio}px`).matches){
				physical.height = height;
				break;
			}
		}
	}
	
	const resolutions = {
		portrait: [
			{height: 1366, width: 768},
			{height: 1440, width: 900},
			{height: 1600, width: 900},
			{height: 1920, width: 1080},
			{height: 2560, width: 1440},
			{height: 4096, width: 2160},
			{height: 8192, width: 6144},
		],
		landscape: [
			{width: 1366, height: 768},
			{width: 1440, height: 900},
			{width: 1600, height: 900},
			{width: 1920, height: 1080},
			{width: 2560, height: 1440},
			{width: 4096, height: 2160},
			{width: 8192, height: 6144},
		]
	};
	
	function getScreenDimensions(prefs, window){
		const screenSize = prefs("screenSize", window.location);
		if (screenSize.match(/\s*\d+\s*x\s*\d+\s*$/)){
			const [width, height] = screenSize.split("x").map(function(value){
				return Math.round(parseFloat(value.trim()));
			});
			return {
				width: width / window.devicePixelRatio,
				height: height / window.devicePixelRatio
			};
		}
		if (!prefs("fakeMinimalScreenSize", window.location)){
			return window.screen;
		}
		const isLandscape = window.screen.width > window.screen.height;
		// subtract 0.5 to adjust for potential rounding errors
		const innerWidth = (window.innerWidth - 0.5) * window.devicePixelRatio;
		const innerHeight = (window.innerHeight - 0.5) * window.devicePixelRatio;
		for (let resolution of resolutions[isLandscape? "landscape": "portrait"]){
			if (resolution.width >= innerWidth && resolution.height >= innerHeight){
				return {
					width: resolution.width / window.devicePixelRatio,
					height: resolution.height / window.devicePixelRatio
				};
			}
		}
		return window.screen;
	}
	
	function getFaker(dimension){
		return function fake(args, check){
			const {prefs, notify, window, original} = check;
			const originalValue = original.call(this, ...args);
			const returnValue = (typeof dimension) === "function"?
				dimension(window):
				dimension?
					Math.round(getScreenDimensions(prefs, window)[dimension]):
					0;
			if (originalValue !== returnValue){
				notify("fakedScreenReadout");
			}
			return returnValue;
		};
	}
	
	scope.changedGetters = [
		{
			objectGetters: [function(window){return window.Screen && window.Screen.prototype;}],
			name: "width",
			getterGenerator: function(checker){
				const temp = {
					get width(){
						return checkerWrapper(checker, this, arguments, getFaker("width"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "width").get;
			}
		},
		{
			objectGetters: [function(window){return window.Screen && window.Screen.prototype;}],
			name: "height",
			getterGenerator: function(checker){
				const temp = {
					get height(){
						return checkerWrapper(checker, this, arguments, getFaker("height"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "height").get;
			}
		},
		{
			objectGetters: [function(window){return window.Screen && window.Screen.prototype;}],
			name: "availWidth",
			getterGenerator: function(checker){
				const temp = {
					get availWidth(){
						return checkerWrapper(checker, this, arguments, getFaker("width"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "availWidth").get;
			}
		},
		{
			objectGetters: [function(window){return window.Screen && window.Screen.prototype;}],
			name: "availHeight",
			getterGenerator: function(checker){
				const temp = {
					get availHeight(){
						return checkerWrapper(checker, this, arguments, getFaker("height"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "availHeight").get;
			}
		},
		{
			objectGetters: [function(window){return window.Screen && window.Screen.prototype;}],
			name: "availLeft",
			getterGenerator: function(checker){
				const temp = {
					get availLeft(){
						return checkerWrapper(checker, this, arguments, getFaker(0));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "availLeft").get;
			}
		},
		{
			objectGetters: [function(window){return window.Screen && window.Screen.prototype;}],
			name: "availTop",
			getterGenerator: function(checker){
				const temp = {
					get availTop(){
						return checkerWrapper(checker, this, arguments, getFaker(0));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "availTop").get;
			}
		},
		{
			objectGetters: [function(window){return window;}],
			name: "outerWidth",
			getterGenerator: function(checker){
				const temp = {
					get outerWidth(){
						return checkerWrapper(checker, this, arguments, getFaker(window => window.top.innerWidth));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "outerWidth").get;
			}
		},
		{
			objectGetters: [function(window){return window;}],
			name: "outerHeight",
			getterGenerator: function(checker){
				const temp = {
					get outerHeight(){
						return checkerWrapper(checker, this, arguments, getFaker(window => window.top.innerHeight));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "outerHeight").get;
			}
		},
		{
			objectGetters: [function(window){return window.MediaQueryList && window.MediaQueryList.prototype;}],
			name: "matches",
			getterGenerator: function(checker){
				function getAlteredMedia(originalMedia, prefs, window){
					const dimensions = getScreenDimensions(prefs, window);
					return originalMedia.replace(
						/\(\s*(?:(min|max)-)?device-(width|height):\s+(\d+\.?\d*)px\s*\)/,
						function(m, type, dimension, value){
							value = parseFloat(value);
							let newCompareValue;
							switch (type){
								case "min":
									if (value <= dimensions[dimension]){
										newCompareValue = 0;
									}
									else {
										newCompareValue = 2 * physical[dimension];
									}
									break;
								case "max":
									if (value >= dimensions[dimension]){
										newCompareValue = 2 * physical[dimension];
									}
									else {
										newCompareValue = 0;
									}
									break;
								default:
									if (
										Math.round(value * 100) ===
										Math.round(dimensions[dimension] * 100)
									){
										newCompareValue = physical[dimension];
									}
									else {
										newCompareValue = 0;
									}
							}
							return "(" + (type? type + "-": "") +
								"device-" + dimension + ": " +
								(
									newCompareValue /
									window.devicePixelRatio
								) + "px)";
						}
					);
				}
				const temp = {
					get matches(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							const originalValue = original.call(this, ...args);
							const screenSize = prefs("screenSize", window.location);
							if (
								(
									screenSize.match(/\s*\d+\s*x\s*\d+\s*$/) ||
									prefs("fakeMinimalScreenSize", window.location)
								) &&
								this.media.match(/device-(width|height)/)
							){
								const originalMedia = this.media;
								const alteredMedia = getAlteredMedia(originalMedia, prefs, window);
								if (alteredMedia !== originalMedia){
									const alteredQuery = window.matchMedia(alteredMedia);
									const fakedValue = original.call(alteredQuery);
									if (originalValue !== fakedValue){
										notify("fakedScreenReadout");
									}
									return fakedValue;
								}
							}
							return originalValue;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "matches").get;
			}
		},
	];
	
	setGetterProperties(scope.changedGetters, {
		type: "readout",
		getStatus: getStatusByFlag("protectScreen"),
		api: "screen"
	});
}());