(function(){
	"use strict";
	
	var iframeCode = atob(
		document.getElementById("iframe").src.replace(/^.+base64,/, "")
	);
	
	document.getElementById("code").textContent = iframeCode;
	
	var blob = new Blob([iframeCode], {type: "text/html"});
	var newurl = window.URL.createObjectURL(blob);
	document.getElementById("blobIframe").src = newurl;
}());