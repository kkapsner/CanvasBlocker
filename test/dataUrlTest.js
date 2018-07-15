(function(){
	"use strict";
	
	document.getElementById("code").textContent = atob(
		document.getElementById("iframe").src.replace("data:text/html;base64,", "")
	);
}());