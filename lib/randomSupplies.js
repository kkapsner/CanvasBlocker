/* jslint moz: true, bitwise: true */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";
	
	const persistentRnd = {};
	exports.persistent = {
		getRng: function(length, window){
			var domain = window.document.location.host;
			if (!persistentRnd[domain]){
				persistentRnd[domain] = new Uint8Array(128);
				for (var i = 0; i < persistentRnd[domain].length; i += 1){
					persistentRnd[domain][i] = Math.floor(Math.random() * 0xFF);
				}
			}
			var bitSet = persistentRnd[domain];
			
			return function(value, i){
				var index = value & 0x7F;
				var bitIndex = ((i & 0x03) << 1) | (value >>> 7);
				var bit = (bitSet[index] >>> bitIndex) & 0x01;
				return value ^ bit;
			};
		}
	};
	
	exports.nonPersistent = {
		getRng: function(length, window){
			var randomI = 65536;
			// var randomOffset = 0;
			var randomNumbers = new Uint8Array(Math.min(65536, length));
			
			return function(value, i){
				if (randomI >= randomNumbers.length){
					randomI = 0;
					// randomOffset += randomNumbers.length;
					if (length - i < 65536){
						randomNumbers = new Uint8Array(length - i);
					}
					window.crypto.getRandomValues(randomNumbers);
				}
				var rnd = randomNumbers[randomI];
				if (value >= 0x80){
					value = value ^ (rnd & 0x1F);
				}
				else if (value >= 0x40){
					value = value ^ (rnd & 0x0F);
				}
				else if (value >= 0x20){
					value = value ^ (rnd & 0x07);
				}
				else if (value >= 0x10){
					value = value ^ (rnd & 0x03);
				}
				else if (value >= 0x08){
					value = value ^ (rnd & 0x01);
				}
				// else if (value >= 0x04){
					// value = value ^ (rnd * 0x00);
				// }
				randomI += 1;
				return value;
			};
		}
	};
}());	