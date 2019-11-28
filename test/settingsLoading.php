<!DOCTYPE html>
<html>
<head>
	<title>Settings loading test</title>
	<meta http-equiv="content-type" content="text/html; charset=UTF-8">
	<link href="testIcon.svg" type="image/png" rel="icon">
	<link href="testIcon.svg" type="image/png" rel="shortcut icon">
	<script>
		console.log(new Date(), "starting first fingerprint", window.name);
		function fingerPrint(){
			"use strict";var canvas = document.createElement("canvas");
			canvas.setAttribute("width", 220);
			canvas.setAttribute("height", 30);
			
			var fp_text = "BrowserLeaks,com <canvas> 10";
			
			var ctx = canvas.getContext("2d");
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
		function hash(url){
			var buffer = new TextEncoder("utf-8").encode(url);
			return crypto.subtle.digest("SHA-256", buffer).then(function(hash){
				var chunks = [];
				(new Uint32Array(hash)).forEach(function(num){
					chunks.push(num.toString(16));
				});
				return chunks.map(function(chunk){
					return "0".repeat(8 - chunk.length) + chunk;
				}).join("");
			});
		}
		try {
			var firstFingerprint = fingerPrint();
		}
		catch (error){
			console.log(new Date(), error);
			var firstFingerprint = false;
		}
	</script>
	<style>
		#output {
			padding: 1em;
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
			var output = document.getElementById("output");
			output.textContent = "context API not blocked";
			window.setTimeout(function(){
				console.log(new Date(), "starting second fingerprint", window.name);
				output.appendChild(document.createElement("br"));
				var secondFingerprint = fingerPrint();
				if (firstFingerprint === secondFingerprint){
					hash(firstFingerprint).then(function(hash){
						output.appendChild(document.createTextNode("fingerprint consistent (" + hash + ") -> good!"));
						output.style.backgroundColor = "green";
					});
				}
				else {
					Promise.all([hash(firstFingerprint), hash(secondFingerprint)]).then(function(hashes){
						output.appendChild(document.createTextNode("fingerprint not consistent (" + hashes[0] + " != " + hashes[1] + ") -> very bad! (potential fingerprint leak)"));
						output.style.backgroundColor = "red";
					});
				}
			}, 500);
		}
		else {
			output.textContent = "context API blocked";
			output.style.backgroundColor = "orange";
		}
	</script>
</body></html>