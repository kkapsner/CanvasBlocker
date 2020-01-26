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
		scope = require.register("./modifiedAudioAPI", {});
	}
	
	const {sha256String: hashing} = require("./hash");
	const {checkerWrapper, setFunctionProperties, getStatusByFlag} = require("./modifiedAPIFunctions");
	
	let randomSupply = null;
	
	const getAudioFakeRate = function(){
		const audioFakeRate = {
			"1": function(){return 1;},
			"10": function(){return 10;},
			"100": function(){return 100;},
			"1000": function(){return 1000;},
			"0.1%": function(array){return array.length / 1000;},
			"1%": function(array){return array.length / 100;},
			"10%": function(array){return array.length / 10;},
			"100%": function(array){return array.length;},
		};
		return function getAudioFakeRate(array, prefs){
			const func = audioFakeRate[prefs("audioFakeRate")];
			if (typeof func === "function"){
				return func(array);
			}
			else {
				return 10;
			}
		};
	}();
	const getAudioNoiseLevel = function(){
		const audioNoiseLevel = {
			"minimal": 0.0001,
			"low": 0.0005,
			"medium": 0.001,
			"high": 0.005,
			"maximal": 0.01
		};
		return function getAudioNoiseLevel(prefs){
			return audioNoiseLevel[prefs("audioNoiseLevel")] || 0.0001;
		};
	}();
	function forEachFixedIndex(prefs, callback){
		if (prefs("audioUseFixedIndices")){
			prefs("audioFixedIndices")
				.split(",")
				.map(function(str){
					return parseInt(str, 10);
				}).filter(function(num){
					return !isNaN(num);
				}).filter(function(num, i, array){
					return array.indexOf(num) === i;
				}).forEach(callback);
		}
	}
	
	function forEachIndex(array, prefs, callback){
		const length = array.length;
		const rate = getAudioFakeRate(array, prefs);
		let start = 0;
		forEachFixedIndex(prefs, function(index){
			callback(index, start);
			start += 1;
		});
		if (start < rate){
			const delta = Math.floor(length / (rate - start));
			const indexRng = randomSupply.getIndexRng(1, length - delta * (rate - start - 1), window);
			let offset = indexRng(0);
			for (let i = start; i < rate; i += 1){
				callback(offset, i);
				offset += delta;
			}
		}
	}
	
	const floatCache = Object.create(null);
	const intCache = Object.create(null);
	
	function arrayHasAnyNonZero(array){
		for (let i = 0, l = array.length; i < l; i += 1){
			if (array[i]){
				return true;
			}
		}
		return false;
	}
	
	function fakeFloat32Array(array, window, prefs){
		if (arrayHasAnyNonZero(array)){
			let cached = false;
			let hash;
			if (prefs("useAudioCache")){
				hash = hashing(array);
				cached = floatCache[hash];
			}
			if (!cached){
				const rate = getAudioFakeRate(array, prefs);
				const noiseLevel = getAudioNoiseLevel(prefs);
				const rng = randomSupply.getRng(rate, window);
				forEachIndex(array, prefs, function(index, i){
					let value;
					if (array[index] !== 0){
						value = array[index] * (1 + (rng(i) / 0xffffffff - 0.5) * noiseLevel);
					}
					else {
						value = Number.EPSILON * (rng(i) / 0xffffffff - 0.5) * noiseLevel;
					}
					array[index] = value;
				});
				if (prefs("useAudioCache")){
					floatCache[hash] = new array.constructor(array);
					floatCache[hashing(array)] = floatCache[hash];
				}
			}
			else {
				array.set(cached);
			}
		}
	}
	function fakeUint8Array(array, window, prefs){
		if (arrayHasAnyNonZero(array)){
			let cached = false;
			let hash;
			if (prefs("useAudioCache")){
				hash = hashing(array);
				cached = intCache[hash];
			}
			if (!cached){
				const rate = getAudioFakeRate(array, prefs);
				const rng = randomSupply.getValueRng(rate, window);
				forEachIndex(array, prefs, function(index, i){
					array[index] = rng(array[index], i);
				});
				if (prefs("useAudioCache")){
					intCache[hash] = new array.constructor(array);
					intCache[hashing(array)] = intCache[hash];
				}
			}
			else {
				array.set(cached);
			}
		}
	}
	
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
	};
	
	const getChannelDataAlreadyFakedArrays = new WeakMap();
	function fakeArrayCheckerCallback(array, fakeFunction, args, check){
		const {prefs, notify, window, original} = check;
		notify("fakedAudioReadout");
		const ret = original.call(this, ...args);
		fakeFunction(array, window, prefs);
		return ret;
	}
	// changed functions and their fakes
	scope.changedFunctions = {
		getFloatFrequencyData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(checker){
				return function getFloatFrequencyData(array){
					return checkerWrapper(checker, this, arguments,
						fakeArrayCheckerCallback.bind(this, array, fakeFloat32Array)
					);
				};
			}
		},
		getByteFrequencyData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(checker){
				return function getByteFrequencyData(array){
					return checkerWrapper(checker, this, arguments,
						fakeArrayCheckerCallback.bind(this, array, fakeUint8Array)
					);
				};
			}
		},
		getFloatTimeDomainData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(checker){
				return function getFloatTimeDomainData(array){
					return checkerWrapper(checker, this, arguments,
						fakeArrayCheckerCallback.bind(this, array, fakeFloat32Array)
					);
				};
			}
		},
		getByteTimeDomainData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(checker){
				return function getByteTimeDomainData(array){
					return checkerWrapper(checker, this, arguments,
						fakeArrayCheckerCallback.bind(this, array, fakeUint8Array)
					);
				};
			}
		},
		getChannelData: {
			object: ["AudioBuffer"],
			fakeGenerator: function(checker){
				return function getChannelData(channel){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						const ret = original.call(this, ...args);
						if (!getChannelDataAlreadyFakedArrays.get(ret)){
							notify("fakedAudioReadout");
							fakeFloat32Array(ret, window, prefs);
							getChannelDataAlreadyFakedArrays.set(ret, true);
						}
						return ret;
					});
				};
			}
		},
		copyFromChannel: {
			object: ["AudioBuffer"],
			fakeGenerator: function(checker){
				return function copyFromChannel(destination, channelNumber, startInChannel){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						const channelData = this.getChannelData(channelNumber);
						if (!getChannelDataAlreadyFakedArrays.get(channelData)){
							notify("fakedAudioReadout");
							fakeFloat32Array(channelData, window, prefs);
							getChannelDataAlreadyFakedArrays.set(channelData, true);
						}
						const ret = original.call(this, ...args);
						return ret;
					});
				};
			}
		},
		getFrequencyResponse: {
			object: ["BiquadFilterNode", "IIRFilterNode"],
			fakeGenerator: function(checker){
				return function getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput){
					return checkerWrapper(checker, this, arguments, function(args, check){
						const {prefs, notify, window, original} = check;
						notify("fakedAudioReadout");
						const ret = original.call(this, ...args);
						fakeFloat32Array(magResponseOutput, window, prefs);
						fakeFloat32Array(phaseResponseOutput, window, prefs);
						return ret;
					});
				};
			}
		},
	};
	
	setFunctionProperties(scope.changedFunctions, {
		type: "readout",
		getStatus: getStatusByFlag("protectAudio"),
		api: "audio"
	});
}());