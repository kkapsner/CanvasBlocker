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
		window.scope.modifiedDOMRectAPI = {};
		scope = window.scope.modifiedDOMRectAPI;
	}
	
	const {hasType, checkerWrapper} = require("./modifiedAPIFunctions");
	const {byteArrayToString: hash} = require("./hash");
	const getWrapped = require("sdk/getWrapped");
	
	
	var randomSupply = null;
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
	};
	
	function getHash(domRect){
		return hash(new Float64Array([domRect.x, domRect.y, domRect.width, domRect.height]));
	}
	function getValueHash(value){
		return hash(new Float32Array([value]));
	}
	
	const registeredRects = new WeakMap();
	function registerDOMRect(domRect, notify){
		registeredRects.set(getWrapped(domRect), {
			notify: function(){
				let done = false;
				return function(message){
					if (!done){
						done = true;
						notify(message);
					}
				};
			}()
		});
	}
	function getDOMRectRegistration(domRect){
		return registeredRects.get(getWrapped(domRect));
	}
	
	const cache = {};
	const valueCache = [{}, {}, {}, {}];
	function getFakeDomRect(window, domRect, prefs, notify){
		const hash = getHash(domRect);
		let cached = cache[hash];
		if (!cached){
			notify("fakedDOMRectReadout");
			const rng = randomSupply.getRng(4, window);
			const getFakeValue = function getFakeValue(value, i){
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
					const fakedValue = value + 0.01 * (rng(i) / 0xffffffff - 0.5);
					const fakedHash = getValueHash(fakedValue);
					cache[valueHash] = fakedValue;
					cache[fakedHash] = fakedValue;
					return fakedValue;
				}
			};
			cached = new domRect.constructor(
				getFakeValue(domRect.x, 0),
				getFakeValue(domRect.y, 1),
				getFakeValue(domRect.width, 2),
				getFakeValue(domRect.height, 3)
			);
			cache[hash] = cached;
			cache[getHash(cached)] = cached;
		}
		return cached;
	}
	
	scope.changedFunctions = {
		getClientRects: {
			type: "readout",
			api: "domRect",
			getStatus: getStatus,
			object: ["Range", "Element"],
			fakeGenerator: function(checker){
				return function getClientRects(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						var ret = original.apply(this, window.Array.from(args));
						for (let i = 0; i < ret.length; i += 1){
							registerDOMRect(ret[i], notify);
						}
						return ret;
					});
				};
			}
		},
		getBoundingClientRect: {
			type: "readout",
			api: "domRect",
			getStatus: getStatus,
			object: ["Range", "Element"],
			fakeGenerator: function(checker){
				return function getBoundingClientRect(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						var ret = original.apply(this, window.Array.from(args));
						registerDOMRect(ret, notify);
						return ret;
					});
				};
				
			}
		},
		getBounds: {
			type: "readout",
			api: "domRect",
			getStatus: getStatus,
			object: ["DOMQuad"],
			fakeGenerator: function(checker){
				return function getBounds(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						var ret = original.apply(this, window.Array.from(args));
						registerDOMRect(ret, notify);
						return ret;
					});
				};
			}
		},
		getBBox: {
			type: "readout",
			api: "domRect",
			getStatus: getStatus,
			object: ["SVGGraphicsElement"],
			fakeGenerator: function(checker){
				return function getBBox(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						var ret = original.apply(this, window.Array.from(args));
						registerDOMRect(ret, notify);
						return ret;
					});
				};
			}
		},
		getExtentOfChar: {
			type: "readout",
			api: "domRect",
			getStatus: getStatus,
			object: ["SVGTextContentElement"],
			fakeGenerator: function(checker){
				return function getBBox(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						var ret = original.apply(this, window.Array.from(args));
						registerDOMRect(ret, notify);
						return ret;
					});
				};
			}
		},
	};
	
	function createCheckerCallback(property){
		return function(args, check){
			const {prefs, notify, window, original} = check;
			const originalValue = original.apply(this, window.Array.from(args));
			if (prefs("protectDOMRect", window.location)){
				const registration = getDOMRectRegistration(this);
				if (registration){
					return getFakeDomRect(window, this, prefs, registration.notify)[property];
				}
			}
			
			return originalValue;
		};
	}
	function setProperty(domRect, window, original, newValue, property, prefs){ // eslint-disable-line max-params
		const registration = getDOMRectRegistration(domRect);
		if (registration){
			const fakeDomRect = getFakeDomRect(window, domRect, prefs, registration.notify);
			registeredRects.delete(getWrapped(domRect));
			["x", "y", "width", "height"].forEach(function(prop){
				if (prop === property){
					domRect[prop] = newValue;
				}
				else {
					domRect[prop] = fakeDomRect[prop];
				}
			});
		}
		else {
			original.apply(domRect, window.Array.from(arguments));
		}
	}
	
	scope.changedGetters = [
		{
			objectGetters: [
				function(window){return window.DOMRect && window.DOMRect.prototype;},
				function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
			],
			name: "x",
			getterGenerator: function(checker){
				const temp = {
					get x(){
						return checkerWrapper(checker, this, arguments, createCheckerCallback("x"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "x").get;
			},
			setterGenerator: function(window, original, prefs){
				const temp = {
					set x(x){
						setProperty(this, window, original, x, "x", prefs);
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "x").set;
			}
		},
		{
			objectGetters: [
				function(window){return window.DOMRect && window.DOMRect.prototype;},
				function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
			],
			name: "y",
			getterGenerator: function(checker){
				const temp = {
					get y(){
						return checkerWrapper(checker, this, arguments, createCheckerCallback("y"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "y").get;
			},
			setterGenerator: function(window, original, prefs){
				const temp = {
					set y(y){
						setProperty(this, window, original, y, "y", prefs);
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "y").set;
			}
		},
		{
			objectGetters: [
				function(window){return window.DOMRect && window.DOMRect.prototype;},
				function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
			],
			name: "width",
			getterGenerator: function(checker){
				const temp = {
					get width(){
						return checkerWrapper(checker, this, arguments, createCheckerCallback("width"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "width").get;
			},
			setterGenerator: function(window, original, prefs){
				const temp = {
					set width(width){
						setProperty(this, window, original, width, "width", prefs);
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "width").set;
			}
		},
		{
			objectGetters: [
				function(window){return window.DOMRect && window.DOMRect.prototype;},
				function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
			],
			name: "height",
			getterGenerator: function(checker){
				const temp = {
					get height(){
						return checkerWrapper(checker, this, arguments, createCheckerCallback("height"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "height").get;
			},
			setterGenerator: function(window, original, prefs){
				const temp = {
					set height(height){
						setProperty(this, window, original, height, "height", prefs);
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "height").set;
			}
		},
		{
			objectGetters: [
				function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
			],
			name: "left",
			getterGenerator: function(checker){
				const callback = createCheckerCallback("left");
				const temp = {
					get left(){
						return checkerWrapper(checker, this, arguments, callback);
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "left").get;
			}
		},
		{
			objectGetters: [
				function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
			],
			name: "right",
			getterGenerator: function(checker){
				const temp = {
					get right(){
						return checkerWrapper(checker, this, arguments, createCheckerCallback("right"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "right").get;
			}
		},
		{
			objectGetters: [
				function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
			],
			name: "top",
			getterGenerator: function(checker){
				const temp = {
					get top(){
						return checkerWrapper(checker, this, arguments, createCheckerCallback("top"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "top").get;
			}
		},
		{
			objectGetters: [
				function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
			],
			name: "bottom",
			getterGenerator: function(checker){
				const temp = {
					get bottom(){
						return checkerWrapper(checker, this, arguments, createCheckerCallback("bottom"));
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "bottom").get;
			}
		},
		{
			objectGetters: [
				function(window){
					return window.IntersectionObserverEntry && window.IntersectionObserverEntry.prototype;
				}
			],
			name: "intersectionRect",
			getterGenerator: function(checker){
				const temp = {
					get intersectionRect(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							const originalValue = original.apply(this, window.Array.from(args));
							registerDOMRect(originalValue, notify);
							return originalValue;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "intersectionRect").get;
			}
		},
		{
			objectGetters: [
				function(window){
					return window.IntersectionObserverEntry && window.IntersectionObserverEntry.prototype;
				}
			],
			name: "boundingClientRect",
			getterGenerator: function(checker){
				const temp = {
					get boundingClientRect(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							const originalValue = original.apply(this, window.Array.from(args));
							registerDOMRect(originalValue, notify);
							return originalValue;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "boundingClientRect").get;
			}
		},
		{
			objectGetters: [
				function(window){
					return window.IntersectionObserverEntry && window.IntersectionObserverEntry.prototype;
				}
			],
			name: "rootBounds",
			getterGenerator: function(checker){
				const temp = {
					get rootBounds(){
						return checkerWrapper(checker, this, arguments, function(args, check){
							const {prefs, notify, window, original} = check;
							const originalValue = original.apply(this, window.Array.from(args));
							registerDOMRect(originalValue, notify);
							return originalValue;
						});
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "rootBounds").get;
			}
		}
	];
	
	
	function getStatus(obj, status, prefs){
		status = Object.create(status);
		status.active = prefs("protectDOMRect", status.url) && hasType(status, "readout");
		return status;
	}
	
	scope.changedGetters.forEach(function(changedGetter){
		changedGetter.type = "readout";
		changedGetter.getStatus = getStatus;
		changedGetter.api = "domRect";
	});
}());