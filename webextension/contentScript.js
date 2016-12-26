var oldAlert = alert;
exportFunction(
	function(str){
		oldAlert("From page script: " + str);
	},
	window,
	{defineAs:'alert'}
);