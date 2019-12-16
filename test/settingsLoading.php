<!DOCTYPE html>
<html>
<head>
	<title>Settings loading test</title>
	<meta http-equiv="content-type" content="text/html; charset=UTF-8">
	<link href="testIcon.svg" type="image/png" rel="icon">
	<link href="testIcon.svg" type="image/png" rel="shortcut icon">
	<script>
		const firstDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");
		console.log(new Date(), "starting first fingerprint", window.name);
		function fingerPrint(){
			"use strict";const canvas = document.createElement("canvas");
			canvas.setAttribute("width", 220);
			canvas.setAttribute("height", 30);
			
			const fp_text = "BrowserLeaks,com <canvas> 10";
			
			const ctx = canvas.getContext("2d");
			ctx.textBaseline = "top";
			ctx.font = "14px 'Arial'";
			ctx.textBaseline = "alphabetic";
			ctx.fillStyle = "#f60";
			ctx.fillRect(125, 1, 62, 20);
			ctx.fillStyle = "#069";
			ctx.fillText(fp_text, 2, 15);
			ctx.fillStyle = "rgba(102, 204, 0, 07)";
			ctx.fillText(fp_text, 4, 17);
			
			return canvas.toDataURL();
		}
		async function hash(url){
			"use strict";
			
			const buffer = new TextEncoder("utf-8").encode(url);
			const hash = await crypto.subtle.digest("SHA-256", buffer);
			const chunks = [];
			(new Uint32Array(hash)).forEach(function(num){
				chunks.push(num.toString(16));
			});
			return chunks.map(function(chunk){
				return "0".repeat(8 - chunk.length) + chunk;
			}).join("");
		}
		let firstFingerprint = false;
		try {
			firstFingerprint = fingerPrint();
		}
		catch (error){
			console.log(new Date(), error);
		}
	</script>
	<style>
		#output {
			padding: 1em;
		}
		.ok {
			background-color: green;
		}
		.kok {
			background-color: orange;
		}
		.nok {
			background-color: red;
		}
	</style>
</head>
<body>
	<h1>Settings loading test</h1>
	<h2>Expected result</h2>
	<ul>
		<li>the background of the test result is green and states "good"</li>
		<li>the displayed hash changes upon reload</li>
	</ul>
	<h2>Test</h2>
	<div id="output"></div>
	<script>
		if (firstFingerprint){
			const output = document.getElementById("output");
			output.textContent = "context API not blocked";
			output.appendChild(document.createElement("br"));
			window.setTimeout(async function(){
				"use strict";
			
				console.log(new Date(), "starting second fingerprint", window.name);
				const secondDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");
				
				if (firstDescriptor.value === secondDescriptor.value){
					output.appendChild(document.createTextNode("descriptor did not change -> good!"));
					output.classList.add("ok");
				}
				else {
					output.appendChild(document.createTextNode("descriptor changed -> bad!"));
					console.log(firstDescriptor, secondDescriptor);
					output.classList.add("nok");
				}
				output.appendChild(document.createElement("br"));
				const secondFingerprint = fingerPrint();
				if (firstFingerprint === secondFingerprint){
					const firstHash = await hash(firstFingerprint);
					output.appendChild(document.createTextNode("fingerprint consistent (" + firstHash + ") -> good!"));
					output.classList.add("ok");
				}
				else {
					const hashes = await Promise.all([hash(firstFingerprint), hash(secondFingerprint)]);
					output.appendChild(
						document.createTextNode(
							"fingerprint not consistent (" +
							hashes[0] + " != " + hashes[1] +
							") -> very bad! (potential fingerprint leak)"
						)
					);
					output.classList.add("nok");
				}
			}, 500);
		}
		else {
			output.textContent = "context API blocked";
			output.classList.add("kok");
		}
	</script>
</body></html>