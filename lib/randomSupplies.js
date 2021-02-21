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
		scope = require.register("./randomSupplies", {});
	}
	
	const rngTemplate = {
		getBitRng: function(length, window){
			const rng = this.getRng(Math.ceil(length / 32), window);
			let rnd = 0;
			let mask = 0xffffffff * 2;
			return function(value, i){
				if (mask > 0xffffffff){
					mask = 1;
					rnd = rng(i / 32);
				}
				let bit = 1 * (!!(rnd & mask));
				mask *= 2;
				return bit;
			};
		},
		getIndexRng: function(length, maxIndex, window){
			const rng = this.getRng(length, window);
			
			return function(i){
				return Math.floor(rng(i) / 0xffffffff * maxIndex);
			};
		},
		getValueRng: function(length, window){
			const rng = this.getBitRng(length, window);
			return function(value, i){
				const rnd = rng(value, i);
				
				// XOR the last bit to alter it... or not
				return value ^ (rnd & 0x01);
			};
		},
		getPixelRng: function(length, window, ignoredColors){
			const rng = this.getValueRng(length, window);
			// eslint-disable-next-line max-params
			return function(r, g, b, a, i){
				const index = String.fromCharCode(r, g, b, a);
				if (ignoredColors[index]){
					return [r, g, b, a];
				}
				const baseIndex = i * 4;
				return [
					rng(r, baseIndex + 0),
					rng(g, baseIndex + 1),
					rng(b, baseIndex + 2),
					rng(a, baseIndex + 3)
				];
			};
		}
	};

	const settings = require("./settings");
	const extension = require("./extension");
	
	function getDomain(window){
		if (settings.sharePersistentRndBetweenDomains){
			return "shared://domain";
		}
		if (!window.location.href || window.location.href === "about:blank"){
			if (window !== window.parent && window.parent){
				return getDomain(window.parent);
			}
			else if (window.opener){
				return getDomain(window.opener);
			}
		}
		return window.location.host;
	}

	let persistentRnd = Object.create(null);
	let cookieStoreId = false;
	function getCookieStoreId(){
		while (cookieStoreId === false){
			extension.waitSync("to wait for cookie store id");
		}
		return cookieStoreId;
	}
	settings.onloaded(function(){
		try {
			let storedData = JSON.parse(
				extension.inIncognitoContext?
					settings.persistentIncognitoRndStorage:
					settings.persistentRndStorage
			);
			for (let domain in storedData){
				const value = storedData[domain];
				if (
					Array.isArray(value) &&
					value.length === 128 &&
					value.every(function(value){
						return typeof value === "number" && value >= 0 && value < 256;
					})
				){
					persistentRnd[domain] = new Uint8Array(value);
				}
			}
		}
		catch (error){
			// JSON is not valid -> ignore it
		}
	});
	const getPersistentRnd = (function(){
		
		extension.message.on(function(data){
			if (data["canvasBlocker-set-domain-rnd"]){
				const {domain, incognito, rnd} = data["canvasBlocker-set-domain-rnd"];
				if (incognito === extension.inIncognitoContext){
					persistentRnd[domain] = new Uint8Array(rnd);
				}
			}
			if (data["canvasBlocker-clear-domain-rnd"]){
				const domain = getCookieStoreId() + getDomain(window);
				let ownPersistendRnd = data["canvasBlocker-clear-domain-rnd"] !== "force"? persistentRnd[domain]: false;
				persistentRnd = Object.create(null);
				if (ownPersistendRnd){
					persistentRnd[domain] = ownPersistendRnd;
					extension.message.send({
						"canvasBlocker-new-domain-rnd": {
							domain,
							incognito: extension.inIncognitoContext,
							rnd: Array.from(persistentRnd[domain])
						}
					});
				}
			}
		});
		
		return function getPersistentRnd(window){
			const domain = getCookieStoreId() + getDomain(window);
			if (!persistentRnd[domain]){
				// create the (sub-)domains random numbers if not existing
				persistentRnd[domain] = new Uint8Array(128);
				window.crypto.getRandomValues(persistentRnd[domain]);
				extension.message.send({
					"canvasBlocker-new-domain-rnd": {
						domain,
						incognito: extension.inIncognitoContext,
						rnd: Array.from(persistentRnd[domain])
					}
				});
			}
			return persistentRnd[domain];
		};
	}());
	
	scope.persistent = Object.create(rngTemplate);
	scope.persistent.name = "persistent";
	scope.persistent.setDomainRnd = function(domain, rnd){
		persistentRnd[domain] = new Uint8Array(rnd);
	};
	scope.persistent.setCookieStoreId = function(newCookieStoreId){
		if (typeof newCookieStoreId === "string"){
			cookieStoreId = (
				newCookieStoreId !== "" &&
				newCookieStoreId !== "firefox-default"
			)? newCookieStoreId + "@": "";
		}
	};
	scope.persistent.getRng = function(length, window){
		const bitSet = new Uint32Array(getPersistentRnd(window).buffer);
		const bitSetLength = bitSet.length;
		return function(i){
			return bitSet[i % bitSetLength];
		};
	};
	scope.persistent.getBitRng = function(length, window){
		const bitSet = getPersistentRnd(window);
		
		return function(value, i){
			// use the last 7 bits from the value for the index of the
			// random number
			const index = value & 0x7F;
			
			// use the last 3 bits from the position and the first bit from
			// from the value to get bit to use from the random number
			const bitIndex = ((i & 0x03) << 1) | (value >>> 7);
			
			// extract the bit
			const bit = (bitSet[index] >>> bitIndex) & 0x01;
			
			return bit;
		};
	};
	
	scope.constant = Object.create(rngTemplate);
	scope.constant.name = "constant";
	scope.constant.getRng = function(length, window){
		return scope.nonPersistent.getRng(length, window);
	};
	scope.constant.getPixelRng = (function(){
		const colors = Object.create(null);
		return function getConstantPixelRng(length, window, ignoredColors){
			const rng = scope.nonPersistent.getValueRng(1024, window);
			
			// eslint-disable-next-line max-params
			return function(r, g, b, a, i){
				const index = String.fromCharCode(r, g, b, a);
				if (ignoredColors[index]){
					return [r, g, b, a];
				}
				let color = colors[index];
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
	}());
	
	scope.nonPersistent = Object.create(rngTemplate);
	scope.nonPersistent.name = "nonPersistent";
	scope.nonPersistent.getRng = function(length, window){
		const maxLength = 0x4000;
		let randomI = maxLength;
		let randomNumbers = new Uint32Array(Math.min(maxLength, length));
		return function(i){
			if (randomI >= randomNumbers.length){
				// refill the random number bucket if empty
				randomI = 0;
				if (length - i < maxLength){
					randomNumbers = new Uint32Array(Math.max(1, length - i));
				}
				window.crypto.getRandomValues(randomNumbers);
			}
			const rnd = randomNumbers[randomI];
			randomI += 1;
			
			return rnd;
		};
	};
	
	scope.white = {
		name: "white",
		getRng: function(){
			return function(){
				return 255;
			};
		},
		getBitRng: function(){
			return function(){
				return 1;
			};
		},
		getIndexRng: function(){
			return function(){
				return 0;
			};
		},
		getValueRng: function(){
			return this.getRng();
		},
		getPixelRng: function(){
			return function(){
				return [255, 255, 255, 255];
			};
		}
	};
}());