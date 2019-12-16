
function draw(canvas){
	"use strict";
	
	canvas.setAttribute("width", 220);
	canvas.setAttribute("height", 30);
	
	const fp_text = "BrowserLeaks,com <canvas> 10";
	
	const ctx = canvas.getContext("2d");
	ctx.textBaseline = "top";
	ctx.font = "14px 'Arial'";
	ctx.textBaseline = "alphabetic";
	ctx.fillStyle = "#f60";
	ctx.fillRect(125, 1, 62, 20);
	ctx.fillStyle = "#069";
	ctx.fillText(fp_text, 2, 15);
	ctx.fillStyle = "rgba(102, 204, 0, 07)";
	ctx.fillText(fp_text, 4, 17);
	
	return ctx;
}
function test(window){
	"use strict";
	
	// create window canvas
	const canvas = document.createElement("canvas");
	// draw image in window canvas
	draw(canvas);
	return window.HTMLCanvasElement.prototype.toDataURL.call(canvas);
}
async function hash(string){
	"use strict";
	
	const buffer = new TextEncoder("utf-8").encode(string);
	const hash = await crypto.subtle.digest("SHA-256", buffer);
	const chunks = [];
	(new Uint32Array(hash)).forEach(function(num){
		chunks.push(num.toString(16));
	});
	return chunks.map(function(chunk){
		return "0".repeat(8 - chunk.length) + chunk;
	}).join("");
}

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
	
	const hashValue = await hash(test(window));
	addLine("canvas hash: " + hashValue);
}());