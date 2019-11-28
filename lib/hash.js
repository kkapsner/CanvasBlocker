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
		scope = require.register("./hash", {});
	}
	scope.byteArrayToString = function byteArrayToString(byteArray){
		return String.fromCharCode.apply(String, new Uint16Array(byteArray.buffer));
	};
	
	scope.none = function(){
		return Symbol("no hash");
	};
	
	scope.sumXor = function(inputByteArray){
		const hash = new Uint32Array(4);
		// const sum = new Float64Array(hash.buffer, 8, 1);
		const intView = new Uint32Array(inputByteArray.buffer);
		// const floatView = new Float32Array(inputByteArray.buffer);
		const length = intView.length;
		for (let i = 0; i < length; i += 1){
			// sum[0] += floatView[i];
			hash[0] ^= intView[i];
			hash[1] = (hash[1] >>> 7 | hash[1] << 25) ^ (intView[i] >>> 11 | intView[i] << 21);
		}
		return hash;
	};
	
	scope.hashCode = function(inputByteArray){
		const hash = new Uint32Array(1);
		const intView = new Uint32Array(inputByteArray.buffer);
		const length = intView.length;
		for (let i = 0; i < length; i += 1){
			const v = hash[0];
			hash[0] = ((v << 5) - v) + intView[i];
		}
		return hash;
	};
	
	scope.md5 = function(){
		function leftRotate(v, rotate){
			return v << rotate | v >>> (32 - rotate);
		}
		const r = new Uint8Array([
			7, 12, 17, 22,  7, 12, 17, 22,  7, 12,
			17, 22,  7, 12, 17, 22,  5,  9, 14, 20,
			5,  9, 14, 20,  5,  9, 14, 20,  5,  9,
			14, 20,  4, 11, 16, 23,  4, 11, 16, 23,
			4, 11, 16, 23,  4, 11, 16, 23,  6, 10,
			15, 21,  6, 10, 15, 21,  6, 10, 15, 21,
			6, 10, 15, 21
		]);
		const k = new Uint32Array([
			0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf,
			0x4787c62a, 0xa8304613, 0xfd469501, 0x698098d8, 0x8b44f7af,
			0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e,
			0x49b40821, 0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa,
			0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8, 0x21e1cde6,
			0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8,
			0x676f02d9, 0x8d2a4c8a, 0xfffa3942, 0x8771f681, 0x6d9d6122,
			0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
			0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039,
			0xe6db99e5, 0x1fa27cf8, 0xc4ac5665, 0xf4292244, 0x432aff97,
			0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d,
			0x85845dd1, 0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1,
			0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
		]);
		const hInitial = new Uint32Array([
			0x67452301, 0xEFCDAB89, 0x98BADCFE, 0x10325476
		]);
		const h = new Uint32Array(4);
		const w = new Uint32Array(16);
		const temp = new Uint32Array(6);
		return function md5(inputByteArray){
			h.set(hInitial);
			
			const length = inputByteArray.buffer.byteLength;
			const messageBitLength = length * 8;
			
			// create byte array with length dividable by 64 (512 bit)
			const neededLength = Math.ceil((length + 1 + 8) / 64) * 64;
			const messageByteArray = new Uint8Array(neededLength);
			messageByteArray.set(new Uint8Array(inputByteArray.buffer));
			const view = new DataView(messageByteArray.buffer);
			
			// append 10...000000
			messageByteArray[length] = 0x80;
			// append size in 64 bit big endian
			view.setUint32(neededLength - 8, messageBitLength, true);
			
			for (let i = 0; i < neededLength; i += 64){
				for (let j = 0; j < 64; j += 4){
					w[j / 4] = view.getUint32(i + j, true);
				}
				
				temp.set(h);
				for (let j = 0; j < 64; j += 1){
					if (j < 16){
						temp[4] = (temp[3] ^ (temp[1] & (temp[2] ^ temp[3])));
						temp[5] = j;
					}
					else if (j < 32){
						temp[4] = (temp[2] ^ (temp[3] & (temp[1] ^ temp[2])));
						temp[5] = (5*j + 1) % 16;
					}
					else if (j < 48){
						temp[4] = ((temp[1] ^ temp[2]) ^ temp[3]);
						temp[5] = (3*j + 5) % 16;
					}
					else {
						temp[4] = (temp[2] ^ (temp[1] | (~ temp[3])));
						temp[5] = (7*j) % 16;
					}
					const temp_ = temp[3];
					temp[3] = temp[2];
					temp[2] = temp[1];
					temp[1] = (leftRotate(temp[0] + temp[4] + k[j] + w[temp[5]], r[j]) + temp[1]);
					temp[0] = temp_;
				}
				
				for (let j = 0; j < 4; j += 1){
					h[j] += temp[j];
				}
			}
			
			const hash = new Uint8Array(16);
			const hashView = new DataView(hash.buffer);
			for (let j = 0; j < 4; j += 1){
				hashView.setUint32(j * 4, h[j], true);
			}
			return hash;
		};
	}();
	
	scope.sha256 = function(){
		function rightRotate(v, rotate){
			return v >>> rotate | v << (32 - rotate);
		}
		const hInitial = new Uint32Array([
			0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
		]);
		const h = new Uint32Array(8);
			
		const k = new Uint32Array([
			0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
			0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
			0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
			0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
			0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
			0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
			0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
			0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
		]);
		const w = new Uint32Array(64);
		const temp = new Uint32Array(8);
		return function sha256(inputByteArray){
			// Algorithmus aus http://en.wikipedia.org/wiki/SHA_hash_functions#SHA-256_.28a_SHA-2_variant.29_pseudocode
			
			h.set(hInitial);
			
			const length = inputByteArray.buffer.byteLength;
			const messageBitLength = length * 8;
			
			// create byte array with length dividable by 64 (512 bit)
			const neededLength = Math.ceil((length + 1 + 8) / 64) * 64;
			const messageByteArray = new Uint8Array(neededLength);
			messageByteArray.set(new Uint8Array(inputByteArray.buffer));
			const view = new DataView(messageByteArray.buffer);
			
			// append 10...000000
			messageByteArray[length] = 0x80;
			// append size in 64 bit big endian
			view.setUint32(neededLength - 4, messageBitLength, false);
			
			for (let i = 0; i < neededLength; i += 64){
				for (let j = 0; j < 64; j += 4){
					w[j / 4] = view.getUint32(i + j, false);
				}
				for (let j = 16; j < 64; j += 1){
					const s0 = rightRotate(w[j-15], 7) ^ rightRotate(w[j-15], 18) ^ (w[j-15] >>> 3);
					const s1 = rightRotate(w[j-2], 17) ^ rightRotate(w[j-2], 19) ^ (w[j-2] >>> 10);
					w[j] = w[j-16] + s0 + w[j-7] + s1;
				}
				
				temp.set(h);
				
				for (let j = 0; j < 64; j += 1){
					const s0 = rightRotate(temp[0], 2) ^ rightRotate(temp[0], 13) ^ rightRotate(temp[0], 22);
					const maj = (temp[0] & temp[1]) ^ (temp[0] & temp[2]) ^ (temp[1] & temp[2]);
					const t2 = (s0 + maj);
					const s1 = rightRotate(temp[4], 6) ^ rightRotate(temp[4], 11) ^ rightRotate(temp[4], 25);
					const ch = (temp[4] & temp[5]) ^ ((~ temp[4]) & temp[6]);
					const t1 = (temp[7] + s1 + ch + k[j] + w[j]);
					
					temp[7] = temp[6];
					temp[6] = temp[5];
					temp[5] = temp[4];
					temp[4] = (temp[3] + t1);
					temp[3] = temp[2];
					temp[2] = temp[1];
					temp[1] = temp[0];
					temp[0] = (t1 + t2);
				}
				
				for (let j = 0; j < 8; j += 1){
					h[j] += temp[j];
				}
			}
			
			const hash = new Uint8Array(32);
			const hashView = new DataView(hash.buffer);
			for (let j = 0; j < 8; j += 1){
				hashView.setUint32(j * 4, h[j], false);
			}
			return hash;
		};
	}();
	
	scope.sha256String = function(byteArray){
		return scope.byteArrayToString(scope.sha256(byteArray));
	};
	scope.md5String = function(byteArray){
		return scope.byteArrayToString(scope.md5(byteArray));
	};
	scope.sumXorString = function(byteArray){
		return scope.byteArrayToString(scope.sumXor(byteArray));
	};
	scope.hashCodeString = function(byteArray){
		return String.fromCharCode(scope.hashCode(byteArray)[0]);
	};
}());