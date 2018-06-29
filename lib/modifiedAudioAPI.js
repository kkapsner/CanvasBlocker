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
		window.scope.modifiedAudioAPI = {};
		scope = window.scope.modifiedAudioAPI;
	}
	
	const logging = require("./logging");
	const getWrapped = require("sdk/getWrapped");
	
	var randomSupply = null;
	
	const getAudioFakeRate = function(){
		const audioFakeRate = {
			"1": function(array){return 1;},
			"10": function(array){return 10;},
			"100": function(array){return 100;},
			"1000": function(array){return 1000;},
			"0.1%": function(array){return array.length / 1000;},
			"1%": function(array){return array.length / 100;},
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
		var l = array.length;
		var rate = getAudioFakeRate(array, prefs);
		var indexRng = randomSupply.getIndexRng(rate, l, window);
		var start = 0;
		forEachFixedIndex(prefs, function(index){
			callback(index, start);
			start += 1;
		});
		for (var i = start; i < rate; i += 1){
			callback(indexRng(i), i);
		}
	}
	
	function fakeFloat32Array(array, window, prefs){
		if (prefs("protectAudio")){
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
		}
	}
	function fakeUint8Array(array, window, prefs){
		if (prefs("protectAudio")){
			var rate = getAudioFakeRate(array, prefs);
			var rng = randomSupply.getValueRng(rate, window);
			forEachIndex(prefs, function(index, i){
				array[index] = rng(array[index], i);
			});
		}
	}
	
	function hasType(status, type){
		return status.type.indexOf(type) !== -1;
	}
	
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
	};
	
	function getStatus(obj, status){
		status = Object.create(status);
		status.active = hasType(status, "readout");
		return status;
	}
	
	let notified = new Map();
	function notifyOnce(name, notify){
		if (!notified.get(name)){
			notify("fakedAudioReadout");
			notified.set(name, true);
		}
	}
	// changed functions and their fakes
	scope.changedFunctions = {
		getFloatFrequencyData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getFloatFrequencyData(array){
					notifyOnce("getFloatFrequencyData", notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(array, window, prefs);
					return ret;
				};
			}
		},
		getByteFrequencyData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getByteFrequencyData(array){
					notifyOnce("getByteFrequencyData", notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeUint8Array(array, window, prefs);
					return ret;
				};
			}
		},
		getFloatTimeDomainData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getFloatTimeDomainData(array){
					notifyOnce("getFloatTimeDomainData", notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(array, window, prefs);
					return ret;
				};
			}
		},
		getByteTimeDomainData: {
			object: ["AnalyserNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getByteTimeDomainData(array){
					notifyOnce("getByteTimeDomainData", notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeUint8Array(array, window, prefs);
					return ret;
				};
			}
		},
		getChannelData: {
			object: ["AudioBuffer"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getChannelData(channel){
					notifyOnce("getChannelData", notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(ret, window, prefs);
					return ret;
				};
			}
		},
		copyFromChannel: {
			object: ["AudioBuffer"],
			fakeGenerator: function(prefs, notify, window, original){
				return function copyFromChannel(destination, channelNumber, startInChannel){
					notifyOnce("copyFromChannel", notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(destination, window, prefs);
					return ret;
				};
			}
		},
		getFrequencyResponse: {
			object: ["BiquadFilterNode", "IIRFilterNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput){
					notifyOnce("getFrequencyResponse", notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(magResponseOutput, window, prefs);
					fakeFloat32Array(phaseResponseOutput, window, prefs);
					return ret;
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