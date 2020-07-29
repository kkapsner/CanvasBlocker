<!DOCTYPE html>
<html>
<head>
	<title>DOMRect test</title>
	<meta http-equiv="content-type" content="text/html; charset=UTF-8">
	<link href="testIcon.svg" type="image/png" rel="icon">
	<link href="testIcon.svg" type="image/png" rel="shortcut icon">
	<link href="domRectTest.css" type="text/css" rel="stylesheet">
</head>
<body>
<h1>DOMRect test</h1>
<h2>Expected result</h2>
<ul>
	<li>all the hashes and numbers should be equal for each test</li>
	<li>if "refresh" is clicked the hash must not change</li>
	<li>upon page reload the hashes change (depending on CanvasBlocker settings - e.g. not in the stealth preset)</li>
</ul>
<h2>Tests</h2>
<iframe id="iframe" src="domRectIFrame.php"></iframe>
<div id="noIframe"><?php include("domRectElements.part.html");?></div>
<div id="tests">
	<div class="test">
		<h3 class="title"></h3>
		Hash: <span class="hash"></span><br>
		<span class="content-hidable content-hidden">Data: <span class="toggle"><span class="anti-content">&plus;</span><span class="content">&minus;</span></span><span class="data content"></span></span><br>
		<button class="refresh">refresh</button>
		<button class="performance">measure performance</button>
	</div>
</div>
<script src="domRectTest.js"></script>
</body>
</html>