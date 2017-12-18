<!DOCTYPE html>
<html>
<head>
	<title>Test</title>
	<script>
		console.log(new Date(), "starting first fingerprint");
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
		catch (e){
			console.log(new Date(), e);
			var firstFingerprint = false;
		}
	</script>
</head>
<body>
	<script>
		if (firstFingerprint){
			document.body.textContent = "context API not blocked";
			window.setTimeout(function(){
				console.log(new Date(), "starting second fingerprint");
				document.body.appendChild(document.createElement("br"));
				var secondFingerprint = fingerPrint();
				if (firstFingerprint === secondFingerprint){
					hash(firstFingerprint).then(function(hash){
						document.body.appendChild(document.createTextNode("fingerprint consistent (" + hash + ") -> good!"));
						document.body.style.backgroundColor = "green";
					});
				}
				else {
					Promise.all([hash(firstFingerprint), hash(secondFingerprint)]).then(function(hashes){
						document.body.appendChild(document.createTextNode("fingerprint not consistent (" + hashes[0] + " != " + hashes[1] + ") -> very bad! (potential fingerprint leak)"));
						document.body.style.backgroundColor = "red";
					});
				}
			}, 500);
		}
		else {
			document.body.textContent = "context API blocked";
			document.body.style.backgroundColor = "orange";
		}
	</script>
</body></html>