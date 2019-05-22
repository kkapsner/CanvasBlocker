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
		scope = require.register("./modifiedAudioAPI", {});
	}
	
	const logging = require("./logging");
	const {sha256String: hashing} = require("./hash");
	const {checkerWrapper} = require("./modifiedAPIFunctions");
	
	var randomSupply = null;
	
	const getAudioFakeRate = function(){
		const audioFakeRate = {
			"1": function(array){return 1;},
			"10": function(array){return 10;},
			"100": function(array){return 100;},
			"1000": function(array){return 1000;},
			"0.1%": function(array){return array.length / 1000;},
			"1%": function(array){return array.length / 100;},
			"10%": function(array){return array.length / 10;},
			"100%": function(array){return array.length;},
		};
		return function getAudioFakeRate(array, prefs){
			var func = audioFakeRate[prefs("audioFakeRate")];
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
		var length = array.length;
		var rate = getAudioFakeRate(array, prefs);
		var start = 0;
		forEachFixedIndex(prefs, function(index){
			callback(index, start);
			start += 1;
		});
		if (start < rate){
			var delta = Math.floor(length / (rate - start));
			var indexRng = randomSupply.getIndexRng(1, length - delta * (rate - start - 1), window);
			var offset = indexRng(0);
			for (var i = start; i < rate; i += 1){
				callback(offset, i);
				offset += delta;
			}
		}
	}
	
	const floatCache = Object.create(null);
	const intCache = Object.create(null);
	
	function arrayHasAnyNonZero(array){
		for (var i = 0, l = array.length; i < l; i += 1){
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
				var rate = getAudioFakeRate(array, prefs);
				var noiseLevel = getAudioNoiseLevel(prefs);
				var rng = randomSupply.getRng(rate, window);
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
				var rate = getAudioFakeRate(array, prefs);
				var rng = randomSupply.getValueRng(rate, window);
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
	
	function getStatus(obj, status, prefs){
		status = Object.create(status);
		status.active = prefs("protectAudio", status.url);
		return status;
	}
	
	const getChannelDataAlreadyFakedArrays = new WeakMap();
	// changed functions and their fakes
	scope.changedFunctions = {
		getFloatFrequencyData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(checker){
				return function getFloatFrequencyData(array){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						notify("fakedAudioReadout");
						var ret = original.apply(this, window.Array.from(args));
						fakeFloat32Array(array, window, prefs);
						return ret;
					});
				};
			}
		},
		getByteFrequencyData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(checker){
				return function getByteFrequencyData(array){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						notify("fakedAudioReadout");
						var ret = original.apply(this, window.Array.from(args));
						fakeUint8Array(array, window, prefs);
						return ret;
					});
				};
			}
		},
		getFloatTimeDomainData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(checker){
				return function getFloatTimeDomainData(array){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						notify("fakedAudioReadout");
						var ret = original.apply(this, window.Array.from(args));
						fakeFloat32Array(array, window, prefs);
						return ret;
					});
				};
			}
		},
		getByteTimeDomainData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(checker){
				return function getByteTimeDomainData(array){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						notify("fakedAudioReadout");
						var ret = original.apply(this, window.Array.from(args));
						fakeUint8Array(array, window, prefs);
						return ret;
					});
				};
			}
		},
		getChannelData: {
			object: ["AudioBuffer"],
			fakeGenerator: function(checker){
				return function getChannelData(channel){
					return checkerWrapper(checker, this, arguments, function(args, check){
						var {prefs, notify, window, original} = check;
						var ret = original.apply(this, window.Array.from(args));
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
						var {prefs, notify, window, original} = check;
						var channelData = this.getChannelData(channelNumber);
						if (!getChannelDataAlreadyFakedArrays.get(channelData)){
							notify("fakedAudioReadout");
							fakeFloat32Array(channelData, window, prefs);
							getChannelDataAlreadyFakedArrays.set(channelData, true);
						}
						var ret = original.apply(this, window.Array.from(args));
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
						var {prefs, notify, window, original} = check;
						notify("fakedAudioReadout");
						var ret = original.apply(this, window.Array.from(args));
						fakeFloat32Array(magResponseOutput, window, prefs);
						fakeFloat32Array(phaseResponseOutput, window, prefs);
						return ret;
					});
				};
			}
		},
	};
	Object.keys(scope.changedFunctions).forEach(function(key){
		scope.changedFunctions[key].type = "readout";
		scope.changedFunctions[key].getStatus = getStatus;
		scope.changedFunctions[key].api = "audio";
	});
}());