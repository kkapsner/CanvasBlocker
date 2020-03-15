/* globals testAPI */
(function(){
	"use strict";
	
	const fonts = ["none", "sans-serif", "serif", "monospace", "cursive", "fantasy"];
	const charCodePoints = [
		0x20B9, 0x2581, 0x20BA, 0xA73D, 0xFFFD, 0x20B8, 0x05C6,
		0x1E9E, 0x097F, 0xF003, 0x1CDA, 0x17DD, 0x23AE, 0x0D02, 0x0B82, 0x115A,
		0x2425, 0x302E, 0xA830, 0x2B06, 0x21E4, 0x20BD, 0x2C7B, 0x20B0, 0xFBEE,
		0xF810, 0xFFFF, 0x007F, 0x10A0, 0x1D790, 0x0700, 0x1950, 0x3095, 0x532D,
		0x061C, 0x20E3, 0xFFF9, 0x0218, 0x058F, 0x08E4, 0x09B3, 0x1C50, 0x2619
	];
	const textMetricsProperties = [
		"width",
		"actualBoundingBoxAscent",
		"actualBoundingBoxDescent",
		"actualBoundingBoxLeft",
		"actualBoundingBoxRight",
		"alphabeticBaseline",
		"emHeightAscent",
		"emHeightDescent",
		"fontBoundingBoxAscent",
		"fontBoundingBoxDescent",
		"hangingBaseline",
		"ideographicBaseline",
	].filter(function(property){
		return TextMetrics.prototype.hasOwnProperty(property);
	});
	
	const hashTable = document.querySelector("#measureText .hashes table");
	textMetricsProperties.forEach(function(property){
		const row = document.createElement("tr");
		hashTable.appendChild(row);
		
		const name = document.createElement("td");
		name.textContent = property + ": ";
		row.appendChild(name);
		
		const hash = document.createElement("td");
		hash.className = "hash " + property;
		row.appendChild(hash);
	});
	
	async function testMeasureText(){
		const canvas = document.createElement("canvas");
		document.body.appendChild(canvas);
		const node = document.createElement("span");
		document.body.appendChild(node);
		const context = canvas.getContext("2d");
		
		const data = new Float64Array(fonts.length * charCodePoints.length * textMetricsProperties.length);
		let dataIndex = 0;
		const propertyData = {};
		textMetricsProperties.forEach(function(property){
			propertyData[property] = new Float64Array(fonts.length * charCodePoints.length);
		});
		let propertyDataIndex = 0;
		
		let differences = 0;
		
		fonts.forEach(function(font){
			context.font = node.style.font = "22000px " + font;
			
			charCodePoints.forEach(function(charCodePoint){
				const char = String.fromCodePoint(charCodePoint);
				node.textContent = char;
				
				const textMetric = context.measureText(char);
				const domRect = node.getBoundingClientRect();
				textMetricsProperties.forEach(function(property){
					data[dataIndex] = textMetric[property];
					propertyData[property][propertyDataIndex] = textMetric[property];
					dataIndex += 1;
				});
				propertyDataIndex += 1;
				if (textMetric.width !== domRect.width){
					differences += 1;
					console.log("difference at", char, "(", charCodePoint, ")", "with", font);
					console.log(textMetric.width, "!==", domRect.width);
				}
			});
		});
		document.body.removeChild(canvas);
		document.body.removeChild(node);
		
		document.querySelector("#measureText .differences").textContent =
			differences + " of " + fonts.length * charCodePoints.length;
		textMetricsProperties.forEach(async function(property){
			document.querySelector("#measureText .hash." + property).textContent =
				await testAPI.hash(propertyData[property]);
		});
		document.querySelector("#measureText .hash.all").textContent = await testAPI.hash(data);
		
	}
	
	testMeasureText();
	document.querySelector("#measureText .refresh").addEventListener("click", testMeasureText);
}());