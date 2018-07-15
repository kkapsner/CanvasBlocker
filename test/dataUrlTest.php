<!DOCTYPE html>
<html>
<head>
	<title>data-URL Test</title>
	<style>
		iframe {
			display: block;
			box-sizing: border-box;
			width: 100%;
			height: 7em;
		}
	</style>
</head>
<body>
	<h1>Normal iFrame</h1>
	<iframe src="sendFingerprintTest.html"></iframe>
	<h1>Data-URL iFrame</h1>
	<iframe id="iframe" src="data:text/html;base64,<?php echo base64_encode(file_get_contents("sendFingerprintTest.html"));?>"></iframe>
	<h1>iFrame code</h1>
	<pre id="code"></pre>
	<script src="dataUrlTest.js"></script>
</body></html>