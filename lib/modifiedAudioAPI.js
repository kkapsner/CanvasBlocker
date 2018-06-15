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
	
	const audioFakeRate = {
		"1": function(array){return 1;},
		"10": function(array){return 10;},
		"100": function(array){return 100;},
		"1000": function(array){return 1000;},
		"0.1%": function(array){return array.length / 1000;},
		"1%": function(array){return array.length / 100;},
	};
	function getAudioFakeRate(array, prefs){
		var func = audioFakeRate[prefs("audioFakeRate")];
		if (typeof func === "function"){
			return func(array);
		}
		else {
			return 10;
		}
	}
	const audioNoiseLevel = {
		"minimal": 0.0000001,
		"low": 0.00001,
		"medium": 0.001,
		"high": 0.01,
		"maximal": 0.1
	};
	function getAudioNoiseLevel(prefs){
		return audioNoiseLevel[prefs("audioNoiseLevel")] || 0.0000001;
	}
	
	function fakeFloat32Array(array, window, prefs){
		if (prefs("protectAudio")){
			var l = array.length;
			var rate = getAudioFakeRate(array, prefs);
			var noiseLevel = getAudioNoiseLevel(prefs);
			var indexRng = randomSupply.getIndexRng(rate, l, window);
			var rng = randomSupply.getRng(rate, window);
			for (var i = 0; i < rate; i += 1){
				var index = indexRng(i);
				array[index] += (rng(i) / 0xffffffff - 0.5) * noiseLevel;
			}
		}
	}
	function fakeUint8Array(array, window, prefs){
		if (prefs("protectAudio")){
			var l = array.length;
			var rate = getAudioFakeRate(array, prefs);
			var indexRng = randomSupply.getIndexRng(rate, l, window);
			var rng = randomSupply.getValueRng(rate, window);
			for (var i = 0; i < rate; i += 1){
				var index = indexRng(i);
				array[index] = rng(array[index], i);
			}
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
	
	let notified = false;
	function notifyOnce(notify){
		if (!notified){
			notify("fakedAudioReadout");
			notified = true;
		}
	}
	// changed functions and their fakes
	scope.changedFunctions = {
		getFloatFrequencyData: {
			type: "readout",
			getStatus: getStatus,
			object: ["AnalyserNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getFloatFrequencyData(array){
					notifyOnce(notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(array, window, prefs);
					return ret;
				};
			}
		},
		getByteFrequencyData: {
			type: "readout",
			getStatus: getStatus,
			object: ["AnalyserNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getByteFrequencyData(array){
					notifyOnce(notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeUint8Array(array, window, prefs);
					return ret;
				};
			}
		},
		getFloatTimeDomainData: {
			type: "readout",
			getStatus: getStatus,
			object: ["AnalyserNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getFloatTimeDomainData(array){
					notifyOnce(notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(array, window, prefs);
					return ret;
				};
			}
		},
		getByteTimeDomainData: {
			type: "readout",
			getStatus: getStatus,
			object: ["AnalyserNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getByteTimeDomainData(array){
					notifyOnce(notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeUint8Array(array, window, prefs);
					return ret;
				};
			}
		},
		getChannelData: {
			type: "readout",
			getStatus: getStatus,
			object: ["AudioBuffer"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getChannelData(channel){
					notifyOnce(notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(ret, window, prefs);
					return ret;
				};
			}
		},
		copyFromChannel: {
			type: "readout",
			getStatus: getStatus,
			object: ["AudioBuffer"],
			fakeGenerator: function(prefs, notify, window, original){
				return function copyFromChannel(destination, channelNumber, startInChannel){
					notifyOnce(notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(destination, window, prefs);
					return ret;
				};
			}
		},
		getFrequencyResponse: {
			type: "readout",
			getStatus: getStatus,
			object: ["BiquadFilterNode", "IIRFilterNode"],
			fakeGenerator: function(prefs, notify, window, original){
				return function getFrequencyResponse(frequencyArray, magResponseOutput, phaseResponseOutput){
					notifyOnce(notify);
					var ret = original.apply(this, window.Array.from(arguments));
					fakeFloat32Array(magResponseOutput, window, prefs);
					fakeFloat32Array(phaseResponseOutput, window, prefs);
					return ret;
				};
			}
		},
	};
}());