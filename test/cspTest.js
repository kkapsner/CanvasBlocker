/* globals testAPI, canvasAPI*/
const addLine = function(){
	"use strict";
	
	const output = document.getElementById("results");
	return function(text){
		const line = document.createElement("div");
		line.textContent = text;
		output.appendChild(line);
	};
}();

addLine("window name at start: " + window.name);
window.name = "CanvasBlocker CSP test";
addLine("window name after set: " + window.name);
(async function(){
	"use strict";
	
	const hashValue = await testAPI.hash(canvasAPI.fingerprint(window).url);
	addLine("canvas hash: " + hashValue);
}());

document.getElementById("reloadWith304").addEventListener("click", function(){
	"use strict";
	
	document.cookie = "304=1";
	location.reload();
});