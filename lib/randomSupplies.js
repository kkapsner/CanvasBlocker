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
		window.scope.randomSupplies = {};
		scope = window.scope.randomSupplies;
	}

	const settings = require("./settings");
	
	function getDomain(window){
		if (!window.location.href || window.location.href === "about:blank"){
			if (window !== window.parent){
				return getDomain(window.parent);
			}
			else if (window.opener){
				return getDomain(window.opener);
			}
		}
		return window.location.host;
	}

	var persistentRnd = Object.create(null);
	settings.onloaded(function(){
		try {
			let storedData = JSON.parse(settings.persistentRndStorage);
			for (var domain in storedData){
				var value = storedData[domain];
				if (
					Array.isArray(value) &&
					value.length === 128 &&
					value.every(function(value){
						return typeof value === "number" && value >= 0 && value < 256;
					})
				){
					persistentRnd[domain] = value;
				}
			}
		}
		catch (e){
			// JSON is not valid -> ignore it
		}
	});
	const getPersistentRnd = (function(){
		
		browser.runtime.onMessage.addListener(function(data){
			if (data["canvasBlocker-set-domain-rnd"]){
				var {domain, rnd} = data["canvasBlocker-set-domain-rnd"];
				persistentRnd[domain] = new Uint8Array(rnd);
			}
			if (data["canvasBlocker-clear-domain-rnd"]){
				persistentRnd = Object.create(null);
			}
		});
		
		return function getPersistentRnd(window){
			var domain = getDomain(window);
			if (!persistentRnd[domain]){
				// create the (sub-)domains random numbers if not existing
				persistentRnd[domain] = new Uint8Array(128);
				window.crypto.getRandomValues(persistentRnd[domain]);
				browser.runtime.sendMessage({
					"canvasBlocker-new-domain-rnd": {domain, rnd: Array.from(persistentRnd[domain])}
				});
			}
			return persistentRnd[domain];
		};
	}());
	scope.persistent = {
		name: "persistent",
		setDomainRnd: function(domain, rnd){
			persistentRnd[domain] = new Uint8Array(rnd);
		},
		getRng: function(length, window){
			var bitSet = getPersistentRnd(window);
			
			return function(value, i){
				// use the last 7 bits from the value for the index of the
				// random number
				var index = value & 0x7F;
				
				// use the last 3 bits from the position and the first bit from
				// from the value to get bit to use from the random number
				var bitIndex = ((i & 0x03) << 1) | (value >>> 7);
				
				// extract the bit
				var bit = (bitSet[index] >>> bitIndex) & 0x01;
				
				// XOR the bit and the value to alter the last bit of it... or not
				return value ^ bit;
			};
		},
		getPixelRng: function(length, window, ignoredColors){
			var rng = this.getRng(length, window);
			return function(r, g, b, a, i){ // eslint-disable-line max-params
				var index = String.fromCharCode(r, g, b, a);
				if (ignoredColors[index]){
					return [r, g, b, a];
				}
				var baseIndex = i * 4;
				return [
					rng(r, baseIndex + 0),
					rng(g, baseIndex + 1),
					rng(b, baseIndex + 2),
					rng(a, baseIndex + 3)
				];
			};
		}
	};
	
	scope.constant = {
		name: "constant",
		getRng: function(length, window){
			return scope.nonPersistent.getRng(length, window);
		},
		getPixelRng: (function(){
			var colors = Object.create(null);
			return function getConstantPixelRng(length, window, ignoredColors){
				var rng = scope.nonPersistent.getRng(1024, window);
				
				return function(r, g, b, a, i){ // eslint-disable-line max-params
					var index = String.fromCharCode(r, g, b, a);
					if (ignoredColors[index]){
						return [r, g, b, a];
					}
					var color = colors[index];
					if (!color){
						color = [
							rng(r, 0),
							rng(g, 0),
							rng(b, 0),
							rng(a, 0)
						];
						colors[index] = color;
					}
					return color;
				};
			};
		}())
	};
	
	scope.nonPersistent = {
		name: "nonPersistent",
		getRng: function(length, window){
			// Initialize the random number batch creation
			var randomI = 65536;
			var randomNumbers = new Uint8Array(Math.min(65536, length));
			
			return function(value, i){
				if (randomI >= randomNumbers.length){
					// refill the random number bucket if empty
					randomI = 0;
					if (length - i < 65536){
						randomNumbers = new Uint8Array(length - i);
					}
					window.crypto.getRandomValues(randomNumbers);
				}
				var rnd = randomNumbers[randomI];
				randomI += 1;
				
				// XOR the last bit to alter it... or not
				return value ^ (rnd & 0x01);
			};
		},
		getPixelRng: function(length, window, ignoredColors){
			var rng = this.getRng(length, window);
			return function(r, g, b, a, i){ // eslint-disable-line max-params
				var index = String.fromCharCode(r, g, b, a);
				if (ignoredColors[index]){
					return [r, g, b, a];
				}
				var baseIndex = i * 4;
				return [
					rng(r, baseIndex + 0),
					rng(g, baseIndex + 1),
					rng(b, baseIndex + 2),
					rng(a, baseIndex + 3)
				];
			};
		}
	};

	scope.white = {
		name: "white",
		getRng: function(){
			return function(){
				return 255;
			};
		},
		getPixelRng: function(){
			return function(){
				return [255, 255, 255, 255];
			};
		}
	};
}());