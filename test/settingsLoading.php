<!DOCTYPE html>
<html>
<head>
	<title>Settings loading test</title>
	<meta http-equiv="content-type" content="text/html; charset=UTF-8">
	<link href="testIcon.svg" type="image/png" rel="icon">
	<link href="testIcon.svg" type="image/png" rel="shortcut icon">
	<link rel="stylesheet" href="../default.css" type="text/css">
	<?php
		echo "<script>" . file_get_contents("testAPI.js");
		echo file_get_contents("canvasAPI.js") . "</script>";
	?>
	<script>
		const firstDescriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, "getContext");
		console.log(new Date(), "starting first fingerprint", window.name);
		let firstFingerprint = false;
		try {
			firstFingerprint = canvasAPI.fingerprint().url;
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
			background-color: lightgreen;
		}
		.kok {
			background-color: orange;
		}
		.nok {
			background-color: lightcoral;
		}
	</style>
</head>
<body>
	<h1>Settings loading test</h1>
	<h2>Expected result</h2>
	<ul>
		<li>the background of the test result is green and states "good"</li>
		<li>the displayed hash changes upon reload (depending on CanvasBlocker settings - e.g. not in the stealth preset)</li>
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
				const secondFingerprint = canvasAPI.fingerprint().url;
				if (firstFingerprint === secondFingerprint){
					const firstHash = await testAPI.hash(firstFingerprint);
					output.appendChild(document.createTextNode("fingerprint consistent (" + firstHash + ") -> good!"));
					output.classList.add("ok");
				}
				else {
					const hashes = await Promise.all([testAPI.hash(firstFingerprint), testAPI.hash(secondFingerprint)]);
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