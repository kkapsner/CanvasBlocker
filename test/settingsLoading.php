<!DOCTYPE html>
<html>
<head>
	<title>Test</title>
	<script>
		try {
			var c = document.createElement("canvas").getContext("2d");
		}
		catch (e){
			console.log(e);
			var c = false;
		}
	</script>
</head>
<body>
	<script>
		document.body.textContent = c? "context API not blocked": "context API blocked";
	</script>
</body></html>