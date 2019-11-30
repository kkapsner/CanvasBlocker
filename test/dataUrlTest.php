<!DOCTYPE html>
<html>
<head>
	<title>Data-URL Test</title>
	<meta http-equiv="content-type" content="text/html; charset=UTF-8">
	<link href="testIcon.svg" type="image/png" rel="icon">
	<link href="testIcon.svg" type="image/png" rel="shortcut icon">
	<style>
		iframe, object, embed {
			display: block;
			box-sizing: border-box;
			width: 100%;
			height: 7em;
		}
	</style>
	<link rel="stylesheet" href="data:text/css;base64,Ym9keXtiYWNrZ3JvdW5kLWNvbG9yOiNlMGZmZTA7fQ==">
</head>
<body>
	<h1>Data-URL test</h1>
	This test might not work properly if any other addon is installed that changes the CSP headers (e.g. NoScript or uBlock Origin).
	<h2>Expected result</h2>
	<ul>
		<li>the "Normal" and "blob" iFrames show faked hashes</li>
		<li>the "Data-URL" iFrame, object and embed shows nothing</li>
		<li>the whole page has a green background</li>
	</ul>
	<h2>Tests</h2>
	<h3>Normal iFrame</h3>
	<iframe src="sendFingerprintTest.html"></iframe>
	<h3>Data-URL iFrame</h3>
	<iframe id="iframe" src="data:text/html;base64&#x2c;<?php
		echo base64_encode(
			str_replace(
				'const origin = "iframe";',
				'const origin = "data URL iframe";',
				file_get_contents("sendFingerprintTest.html")
			)
		);
	?>"></iframe>
	<h3>blob iFrame</h3>
	<iframe id="blobIframe"></iframe>
	<h3>Data-URL object</h3>
	<object
		type="text/html"
		data="data:text/html;base64&#x2c;<?php
			echo base64_encode(
				str_replace(
					'const origin = "iframe";',
					'const origin = "data URL object";',
					file_get_contents("sendFingerprintTest.html")
				)
			);
		?>"
	></object>
	<h3>Data-URL embed</h3>
	<embed
		type="text/html"
		src="data:text/html;base64&#x2c;<?php
			echo base64_encode(
				str_replace(
					'const origin = "iframe";',
					'const origin = "data URL embed";',
					file_get_contents("sendFingerprintTest.html")
				)
			);
		?>"
	></embed>
	<h3>iFrame code</h3>
	<pre id="code"></pre>
	<script src="dataUrlTest.js"></script>
	
	<div id="log"></div>
		<form id="form" method="POST" action="http://localhost/server/POST-echo.php">
			<input name="internalId" value="id to be used to link the requests">
			<textarea style="display: block;" name="fingerprint"></textarea>
			<button>submit</button>
		</form>
		<script>
		function draw(canvas){
			"use strict";
			
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
			
			return ctx;
		}
		function topTest(){
			"use strict";
			
			// create window canvas
			var canvas = document.createElement("canvas");
			// draw image in window canvas
			var ctx = draw(canvas);
			return {
				imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
				url: canvas.toDataURL(),
				isPointInPath: getIsPointInPath(ctx)
			};
		}
		function getIsPointInPath(ctx){
			"use strict";
			
			ctx.beginPath();
			ctx.moveTo(20, 19);
			ctx.lineTo(40, 19);
			ctx.lineTo(30, 30);
			ctx.closePath();
			ctx.stroke();
			
			return ctx.isPointInPath(30, 19);
		}
		function hashToString(hash){
			"use strict";
			
			var chunks = [];
			(new Uint32Array(hash)).forEach(function(num){
				chunks.push(num.toString(16));
			});
			return chunks.map(function(chunk){
				return "0".repeat(8 - chunk.length) + chunk;
			}).join("");
		}
		
		var send = function(){
			"use strict";
			return function send(form, {url, imageData, isPointInPath}){
				var buffer = new TextEncoder("utf-8").encode(url);
				Promise.all([
					crypto.subtle.digest("SHA-256", buffer),
					crypto.subtle.digest("SHA-256", imageData.data)
				]).then(function(hashes){
					var data = JSON.stringify({
						urlHash: hashToString(hashes[0]),
						imageDataHash: hashToString(hashes[1]),
						isPointInPath
					}, null, "\t");
					form.fingerprint.value = data;
					var xhr = new XMLHttpRequest();
					xhr.open("POST", form.action + "?main", true);
					xhr.onreadystatechange = function(){
						if (this.readyState === 4){
							const status = this.status;
							if (status === 200 || status === 304) {
								console.log("Sending xhr successful from main page:", data);
							}
							else {
								console.log("Sending xhr failed:", this);
							}
						}
					};
					xhr.send(new FormData(form));
					return;
				}).catch(function(error){
					console.error(error);
				});
			};
		}();

		send(document.getElementById("form"), topTest());
		</script>
</body></html>