<!DOCTYPE html>
<html>
<head>
	<title>data-URL Test</title>
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
	<h1>Normal iFrame</h1>
	<iframe src="sendFingerprintTest.html"></iframe>
	<h1>Data-URL iFrame</h1>
	<iframe id="iframe" src="data:invalid;base64&#x2c;<?php
		echo base64_encode(
			str_replace(
				'const origin = "iframe";',
				'const origin = "data URL iframe";',
				file_get_contents("sendFingerprintTest.html")
			)
		);
	?>"></iframe>
	<h1>Data-URL object</h1>
	<object
		type="invalid"
		data="data:invalid;base64&#x2c;<?php
			echo base64_encode(
				str_replace(
					'const origin = "iframe";',
					'const origin = "data URL object";',
					file_get_contents("sendFingerprintTest.html")
				)
			);
		?>"
	></object>
	<h1>Data-URL embed</h1>
	<embed
		type="invalid"
		src="data:invalid;base64&#x2c;<?php
			echo base64_encode(
				str_replace(
					'const origin = "iframe";',
					'const origin = "data URL embed";',
					file_get_contents("sendFingerprintTest.html")
				)
			);
		?>"
	></embed>
	<h1>iFrame code</h1>
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
		};
		function hashToString(hash){
			var chunks = [];
			(new Uint32Array(hash)).forEach(function(num){
				chunks.push(num.toString(16));
			});
			return chunks.map(function(chunk){
				return "0".repeat(8 - chunk.length) + chunk;
			}).join("");
		}

		function send(form, {url, imageData, isPointInPath}){
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
			});
		}

		send(document.getElementById("form"), topTest());
		</script>
</body></html>