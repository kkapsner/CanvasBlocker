(function(){
	"use strict";
	
	function byteArrayToHex(arrayBuffer){
		var chunks = [];
		(new Uint32Array(arrayBuffer)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	}
	
	var container = document.getElementById("test");
	
	var pxi_output;
	var pxi_full_buffer;
	function run_pxi_fp(){
		var context = new window.OfflineAudioContext(1, 44100, 44100);

		// Create oscillator
		var pxi_oscillator = context.createOscillator();
		pxi_oscillator.type = "triangle";
		pxi_oscillator.frequency.value = 1e4;

		// Create and configure compressor
		var pxi_compressor = context.createDynamicsCompressor();
		pxi_compressor.threshold && (pxi_compressor.threshold.value = -50);
		pxi_compressor.knee && (pxi_compressor.knee.value = 40);
		pxi_compressor.ratio && (pxi_compressor.ratio.value = 12);
		pxi_compressor.reduction && (pxi_compressor.reduction.value = -20);
		pxi_compressor.attack && (pxi_compressor.attack.value = 0);
		pxi_compressor.release && (pxi_compressor.release.value = .25);

		// Connect nodes
		pxi_oscillator.connect(pxi_compressor);
		pxi_compressor.connect(context.destination);

		// Start audio processing
		pxi_oscillator.start(0);
		context.startRendering();
		context.oncomplete = function(event) {
			var str = "";
			var copyTest = new Float32Array(44100);
			event.renderedBuffer.copyFromChannel(copyTest, 0);
			var getTest = event.renderedBuffer.getChannelData(0);
			Promise.all([
				crypto.subtle.digest("SHA-256", getTest),
				crypto.subtle.digest("SHA-256", copyTest),
			]).then(function(hashes){
				container.querySelector(".hash").textContent =
					byteArrayToHex(hashes[0]) +
					" / " +
					byteArrayToHex(hashes[1]);
			});
			var sum = 0;
			for (var i = 4500; i < 5000; i += 1) {
				sum += Math.abs(getTest[i]);
			}
			container.querySelector(".sum").textContent = sum;
			pxi_compressor.disconnect();
		};
	}
	run_pxi_fp();
	container.querySelector("button").addEventListener("click", run_pxi_fp);
}());