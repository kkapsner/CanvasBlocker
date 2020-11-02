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
		scope = require.register("./modifiedDOMRectAPI", {});
	}
	
	const extension = require("./extension");
	const {checkerWrapper, setProperties, getStatusByFlag} = require("./modifiedAPIFunctions");
	const {byteArrayToString: hash} = require("./hash");
	
	
	let randomSupply = null;
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
	function registerDOMRect(domRect, notify, window, prefs){
		registeredRects.set(extension.getWrapped(domRect), {
			notify: function(){
				let done = false;
				return function(message){
					if (!done){
						done = true;
						notify(message);
					}
				};
			}(),
			window,
			prefs
		});
	}
	function getDOMRectRegistration(domRect){
		return registeredRects.get(extension.getWrapped(domRect));
	}
	
	const cache = {};
	const valueCache = [{}, {}, {}, {}, {}, {}, {}];
	scope.cache = {
		valueCache,
		X: 0,
		Y: 1,
		WIDTH: 2,
		HEIGHT: 3,
		OTHER: 4,
		Z: 5,
		W: 6,
	};
	function getFakeValue(value, i, {window, prefs, rng}){
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
	}
	scope.getFakeValue = getFakeValue;
	function getFakeDomRect(window, domRect, prefs, notify){
		const hash = getHash(domRect);
		let cached = cache[hash];
		if (!cached){
			notify("fakedDOMRectReadout");
			const rng = randomSupply.getRng(4, window);
			const env = {window, prefs, rng};
			cached = new (domRect instanceof window.SVGRect? window.DOMRectReadOnly: domRect.constructor)(
				getFakeValue(domRect.x, 0, env),
				getFakeValue(domRect.y, 1, env),
				getFakeValue(domRect.width, 2, env),
				getFakeValue(domRect.height, 3, env)
			);
			cache[hash] = cached;
			cache[getHash(cached)] = cached;
		}
		return cached;
	}
	function getFakeDOMPoint(window, domPoint, prefs){
		const env = {window, prefs, rng: randomSupply.getRng(7, window)};
		return new domPoint.constructor(
			getFakeValue(domPoint.x, 0, env),
			getFakeValue(domPoint.y, 1, env),
			getFakeValue(domPoint.z, 5, env),
			getFakeValue(domPoint.w, 6, env)
		);
	}
	function getFakeSVGPoint(window, svgPoint, prefs){
		const env = {window, prefs, rng: randomSupply.getRng(2, window)};
		svgPoint.x = getFakeValue(svgPoint.x, 0, env);
		svgPoint.y = getFakeValue(svgPoint.y, 1, env);
		return svgPoint;
	}
	function getFakeDOMQuad(window, domQuad, prefs, notify){
		notify("fakedDOMRectReadout");
		return new domQuad.constructor(
			getFakeDOMPoint(window, domQuad.p1, prefs),
			getFakeDOMPoint(window, domQuad.p2, prefs),
			getFakeDOMPoint(window, domQuad.p3, prefs),
			getFakeDOMPoint(window, domQuad.p4, prefs)
		);
	}
	
	function registerCallback(args, check){
		const {prefs, notify, window, original} = check;
		const originalValue = args.length?
			original.call(this, ...args):
			original.call(this);
		registerDOMRect(originalValue, notify, window, prefs);
		return originalValue;
	}
	
	function fakePointCallback(args, check){
		const {prefs, notify, window, original} = check;
		const ret = args.length? original.call(this, ...args): original.call(this);
		notify("fakedDOMRectReadout");
		if (ret instanceof window.SVGPoint){
			return getFakeSVGPoint(window, ret, prefs);
		}
		else {
			return getFakeDOMPoint(window, ret, prefs);
		}
	}
	
	scope.changedFunctions = {
		getClientRects: {
			object: ["Range", "Element"],
			fakeGenerator: function(checker){
				return function getClientRects(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						const ret = args.length? original.call(this, ...args): original.call(this);
						for (let i = 0; i < ret.length; i += 1){
							registerDOMRect(ret[i], notify, window, prefs);
						}
						return ret;
					});
				};
			}
		},
		getBoundingClientRect: {
			object: ["Range", "Element"],
			fakeGenerator: function(checker){
				return function getBoundingClientRect(){
					return checkerWrapper(checker, this, arguments, registerCallback);
				};
				
			}
		},
		getBoxQuads: {
			object: ["Document", "Element", "Text", "CSSPseudoElement"],
			fakeGenerator: function(checker){
				return function getBoxQuads(){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						const ret = args.length? original.call(this, ...args): original.call(this);
						for (let i = 0; i < ret.length; i += 1){
							ret[i] = getFakeDOMQuad(window, ret[i], prefs, notify);
						}
						return ret;
					});
				};
			}
		},
		// It seems only getBoxQuads creates a DOMQuad and this method is behind a flag.
		// So the only way to create one is manually by the constructor and then no fingerprinting is possible.
		// getBounds: {
		// 	object: ["DOMQuad"],
		// 	fakeGenerator: function(checker){
		// 		return function getBounds(){
		// 			return checkerWrapper(checker, this, arguments, registerCallback);
		// 		};
		// 	}
		// },
		getBBox: {
			object: ["SVGGraphicsElement"],
			fakeGenerator: function(checker){
				return function getBBox(){
					return checkerWrapper(checker, this, arguments, registerCallback);
				};
			}
		},
		
		getStartPositionOfChar: {
			object: ["SVGTextContentElement"],
			fakeGenerator: function(checker){
				return function getStartOfChar(){
					return checkerWrapper(checker, this, arguments, fakePointCallback);
				};
			}
		},
		getEndPositionOfChar: {
			object: ["SVGTextContentElement"],
			fakeGenerator: function(checker){
				return function getEndOfChar(){
					return checkerWrapper(checker, this, arguments, fakePointCallback);
				};
			}
		},
		getExtentOfChar: {
			object: ["SVGTextContentElement"],
			fakeGenerator: function(checker){
				return function getExtentOfChar(){
					return checkerWrapper(checker, this, arguments, registerCallback);
				};
			}
		},
		getPointAtLength: {
			object: ["SVGGeometryElement", "SVGPathElement"],
			fakeGenerator: function(checker){
				return function getPointAtLength(){
					return checkerWrapper(checker, this, arguments, fakePointCallback);
				};
			}
		},
	};
	
	function generateChangedDOMRectPropertyGetter(property, readonly = false){
		const changedGetter = {
			objectGetters: readonly?
				[
					function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
				]:
				[
					function(window){return window.DOMRect && window.DOMRect.prototype;},
					function(window){return window.SVGRect && window.SVGRect.prototype;},
					function(window){return window.DOMRectReadOnly && window.DOMRectReadOnly.prototype;}
				],
			name: property,
			getterGenerator: function(){
				const temp = {
					get [property](){
						const registration = getDOMRectRegistration(this);
						if (registration){
							return getFakeDomRect(
								registration.window,
								this,
								registration.prefs,
								registration.notify
							)[property];
						}
						return this[property];
					}
				};
				return Object.getOwnPropertyDescriptor(temp, property).get;
			}
		};
		if (!readonly){
			changedGetter.setterGenerator = function(window, original, prefs){
				const temp = {
					set [property](newValue){
						const registration = getDOMRectRegistration(this);
						if (registration){
							const fakeDomRect = getFakeDomRect(window, this, prefs, registration.notify);
							registeredRects.delete(extension.getWrapped(this));
							["x", "y", "width", "height"].forEach((prop) => {
								if (prop === property){
									this[prop] = newValue;
								}
								else {
									this[prop] = fakeDomRect[prop];
								}
							});
						}
						else {
							original.call(this, ...arguments);
						}
					}
				};
				return Object.getOwnPropertyDescriptor(temp, property).set;
			};
		}
		return changedGetter;
	}
	
	scope.changedGetters = [
		generateChangedDOMRectPropertyGetter("x",      false),
		generateChangedDOMRectPropertyGetter("y",      false),
		generateChangedDOMRectPropertyGetter("width",  false),
		generateChangedDOMRectPropertyGetter("height", false),
		generateChangedDOMRectPropertyGetter("left",   true),
		generateChangedDOMRectPropertyGetter("right",  true),
		generateChangedDOMRectPropertyGetter("top",    true),
		generateChangedDOMRectPropertyGetter("bottom", true),
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
						return checkerWrapper(checker, this, arguments, registerCallback);
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
						return checkerWrapper(checker, this, arguments, registerCallback);
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
						return checkerWrapper(checker, this, arguments, registerCallback);
					}
				};
				return Object.getOwnPropertyDescriptor(temp, "rootBounds").get;
			}
		}
	];
	
	setProperties(scope.changedFunctions, scope.changedGetters, {
		type: "readout",
		getStatus: getStatusByFlag("protectDOMRect"),
		api: "domRect"
	});
}());