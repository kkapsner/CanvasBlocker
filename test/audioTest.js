(function(){
	"use strict";
	
	function byteArrayToHex(arrayBuffer){
		const chunks = [];
		(new Uint32Array(arrayBuffer)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	}
	
	const container = document.getElementById("test");
	const hashContainer = container.querySelector(".hashes");
	let hashSets = Object.create(null);
	
	function createSet(set){
		if (!hashSets[set]){
			const setContainer = document.createElement("tbody");
			hashContainer.appendChild(setContainer);
			const nameRow = document.createElement("tr");
			setContainer.appendChild(nameRow);
			const nameContainer = document.createElement("th");
			nameRow.appendChild(nameContainer);
			nameContainer.colSpan = 2;
			nameContainer.textContent = set;
			hashSets[set] = setContainer;
		}
	}
	
	async function displayData(data, set, title){
		createSet(set);
		const container = document.createElement("tr");
		
		const titleNode = document.createElement("td");
		titleNode.textContent = title;
		container.appendChild(titleNode);
		
		const hashNode = document.createElement("td");
		hashNode.textContent = "calculating hash";
		container.appendChild(hashNode);
		
		hashSets[set].appendChild(container);
		
		const hash = await crypto.subtle.digest("SHA-256", data);
		hashNode.textContent = byteArrayToHex(hash);
	}
	
	function getAudioContext(frequency = 1e4){
		const context = new window.OfflineAudioContext(2, 44100, 44100);
		
		// Create oscillator
		const pxi_oscillator = context.createOscillator();
		pxi_oscillator.type = "triangle";
		pxi_oscillator.frequency.value = frequency;

		// Create and configure compressor
		const pxi_compressor = context.createDynamicsCompressor();
		pxi_compressor.threshold && (pxi_compressor.threshold.value = -50);
		pxi_compressor.knee && (pxi_compressor.knee.value = 40);
		pxi_compressor.ratio && (pxi_compressor.ratio.value = 12);
		pxi_compressor.reduction && (pxi_compressor.reduction.value = -20);
		pxi_compressor.attack && (pxi_compressor.attack.value = 0);
		pxi_compressor.release && (pxi_compressor.release.value = .25);

		// Connect nodes
		pxi_oscillator.connect(pxi_compressor);
		pxi_compressor.connect(context.destination);
		
		pxi_oscillator.start(0);
		
		return context;
	}
	
	function createEmptyData(){
		const emptyArray = new Float32Array(44100);
		displayData(emptyArray, "empty buffer", "no API involved");
		
		const emptyContext = new OfflineAudioContext(1, 44100, 44100);
		const emptyBuffer = emptyContext.createBuffer(1, 44100, 44100);
		
		const emptyCopy = new Float32Array(44100);
		emptyBuffer.copyFromChannel(emptyCopy, 0);
		displayData(emptyCopy, "empty buffer", "copyFromChannel - first");
		
		const emptyData = emptyBuffer.getChannelData(0);
		displayData(emptyData, "empty buffer", "getChannelData - first");
		displayData(emptyBuffer.getChannelData(0), "empty buffer", "getChannelData - second");
		
		const emptyCopy2 = new Float32Array(44100);
		emptyBuffer.copyFromChannel(emptyCopy2, 0);
		displayData(emptyCopy2, "empty buffer", "copyFromChannel - second");
	}
	
	function getIframeWindow(){
		const l = window.length;
		const iframe = document.createElement("iframe");
		document.body.appendChild(iframe);
		const iframeWindow = window[l];
		document.body.removeChild(iframe);
		return iframeWindow;
	}
	
	function createHashData(frequency = 1e4){
		
		const context = getAudioContext(frequency);
		
		const setName = " (" + frequency + " Hz)";
		createSet(setName);
		
		// Start audio processing
		context.startRendering();
		context.oncomplete = function(event){
			const copyTestIframe = new (getIframeWindow().Float32Array)(44100);
			getIframeWindow().AudioBuffer.prototype.copyFromChannel.call(event.renderedBuffer, copyTestIframe, 0);
			displayData(copyTestIframe, setName, "copyFromChannel - iframe");
			
			const chunkTest = new Float32Array(44100);
			const number = new Float32Array(100);
			for (let chunkI = 0; chunkI < 44100; chunkI += number.length){
				event.renderedBuffer.copyFromChannel(number, 0, chunkI);
				chunkTest.set(number, chunkI);
			}
			displayData(chunkTest, setName, "copyFromChannel - chunks");
			
			const copyTest = new Float32Array(44100);
			event.renderedBuffer.copyFromChannel(copyTest, 0);
			displayData(copyTest, setName, "copyFromChannel - first");
			
			
			const getTest = event.renderedBuffer.getChannelData(0);
			displayData(getTest, setName, "getChannelData - first");
			displayData(event.renderedBuffer.getChannelData(0), setName, "getChannelData - second readout");
			displayData(event.renderedBuffer.getChannelData(1), setName, "getChannelData - second channel");
			
			const copyTest2 = new Float32Array(44100);
			event.renderedBuffer.copyFromChannel(copyTest2, 0);
			displayData(copyTest2, setName, "copyFromChannel - second");
			
			if (frequency === 1e4){
				let sum = 0;
				for (let i = 4500; i < 5000; i += 1) {
					sum += Math.abs(getTest[i]);
				}
				container.querySelector(".sum").textContent = sum;
			}
		};
	}
	
	function createAllHashData(){
		hashContainer.innerHTML = "";
		hashSets = Object.create(null);
		createEmptyData();
		createHashData(1e4);
		createHashData(2e4);
	}
	createAllHashData();
	container.querySelector("button").addEventListener("click", createAllHashData);
}());