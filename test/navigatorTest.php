<!DOCTYPE html>
<html>
<head>
	<title>Navigator test</title>
	<meta http-equiv="content-type" content="text/html; charset=UTF-8">
	<link href="testIcon.svg" type="image/png" rel="icon">
	<link href="testIcon.svg" type="image/png" rel="shortcut icon">
</head>
<body>
<h1>Navigator test</h1>
Tests the navigator properties.
<div id="log">
	<div class="log">
		<div class="logLine">
			server site user agent: <?php echo htmlentities($_SERVER["HTTP_USER_AGENT"], ENT_QUOTES, "UTF-8");?>
		</div>
	</div>
</div>
<script>
var serverUserAgent = <?php echo json_encode($_SERVER["HTTP_USER_AGENT"]);?>;
</script>
<script src="navigatorTest.js"></script>
</body></html>