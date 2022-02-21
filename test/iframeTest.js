// eslint-disable-next-line no-var
var log = function(){
	"use strict";
	return function log(...str){
		if (str[str.length - 1] === "match"){
			str.unshift("color: green");
			str.unshift("%cOK");
		}
		else if (str[str.length - 1].startsWith("missmatch")){
			str.unshift("color: red");
			str.unshift("%cX");
		}
		console.log(...str);
	};
}();
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

function compare(string1, string2, alwaysOutputHashes){
	"use strict";
	async function outputHashes(message){
		const hashes = await Promise.all([
			hash(string1),
			hash(string2)
		]);
		console.log(message, ...hashes);
	}
	
	if (string1 === string2){
		if (alwaysOutputHashes){
			outputHashes("Matching hashes:");
		}
		return "match";
	}
	else {
		outputHashes("Hashes that differ:");
		if (string1.length === string2.length){
			let i;
			for (i = 0; i < string1.length; i += 1){
				if (string1.charAt(i) !== string2.charAt(i)){
					break;
				}
			}
			return "missmatch (first at " + i + ")";
		}
		else {
			let i;
			for (i = 0; i < Math.min(string1.length, string2.length); i += 1){
				if (string1.charAt(i) !== string2.charAt(i)){
					break;
				}
			}
			return "missmatch (different lengths, first at " + i + ")";
		}
	}
}
// eslint-disable-next-line no-var
var reference = test(window);
(async function(){
	"use strict";
	try {
		const hashValue = await hash(reference);
		log("reference hash:", hashValue);
	}
	catch (error){
		log("%cX", "color: red", "Unable to compute reference hash:", error);
	}
}());