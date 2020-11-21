<!DOCTYPE html>
<html>
<head>
	<title>Navigator test</title>
	<meta http-equiv="content-type" content="text/html; charset=UTF-8">
	<link href="testIcon.svg" type="image/png" rel="icon">
	<link href="testIcon.svg" type="image/png" rel="shortcut icon">
	<link rel="stylesheet" href="../default.css" type="text/css">
	<style>
		.marked {
			background-color: lightcoral;
		}
	</style>
</head>
<body>
<h1>Navigator test</h1>
Tests the navigator properties. In the default settings of CanvasBlocker the navigator properties are not altered. You have to enable the navigator protection and then open the navigator settings to chose the desired values.
<h2>Expected result</h2>
<ul>
	<li>the server and client user agent match</li>
	<li>the navigator properties are according to what was set in the CanvasBlocker settings</li>
	<li>no line is red or has multiple values (separated by a "|")</li>
</ul>
<h2>Tests</h2>
<div id="log">
	<div class="log">
		<div class="logLine">
			server site user agent: <?php echo htmlentities($_SERVER["HTTP_USER_AGENT"], ENT_QUOTES, "UTF-8");?>
		</div>
	</div>
</div>
<script id="serverUserAgent" type="text/data"><?php echo htmlentities($_SERVER["HTTP_USER_AGENT"], ENT_QUOTES, "UTF-8");?></script>
<script src="iframeAPI.js"></script>
<script src="navigatorTest.js"></script>
</body></html>