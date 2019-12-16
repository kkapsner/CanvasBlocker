(function(){
	"use strict";
	
	const iframeCode = atob(
		document.getElementById("iframe").src.replace(/^.+base64,/, "")
	);
	
	document.getElementById("code").textContent = iframeCode;
	
	const blob = new Blob([iframeCode], {type: "text/html"});
	const newurl = window.URL.createObjectURL(blob);
	document.getElementById("blobIframe").src = newurl;
}());