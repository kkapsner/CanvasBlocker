var log = function(){
	"use strict";
	return function log(...str){
		if (str[str.length - 1] === "match"){
			str.unshift("color: green");
			str.unshift("%cOK");
		}
		else if (str[str.length - 1].substr(0, 9) === "missmatch"){
			str.unshift("color: red");
			str.unshift("%cX");
		}
		// eslint-disable-next-line no-console
		console.log(...str);
	};
}();
function draw(canvas){
	"use strict";
	
	canvas.setAttribute("width", 220);
	canvas.setAttribute("height", 30);
	
	var fp_text = "BrowserLeaks,com <canvas> 10";
	
	var ctx = canvas.getContext("2d");
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
	var canvas = document.createElement("canvas");
	// draw image in window canvas
	draw(canvas);
	return window.HTMLCanvasElement.prototype.toDataURL.call(canvas);
}

function hash(string){
	"use strict";
	
	var buffer = new TextEncoder("utf-8").encode(string);
	return crypto.subtle.digest("SHA-256", buffer).then(function(hash){
		var chunks = [];
		(new Uint32Array(hash)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	});
	
}

function compare(string1, string2, alwaysOutputHashes){
	"use strict";
	function outputHashes(message){
		return Promise.all([
			hash(string1),
			hash(string2)
		]).then(function(hashes){
			// eslint-disable-next-line no-console
			console.log(message, ...hashes);
			return;
		});
		
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
var reference = test(window);
hash(reference).then(function(hash){
	"use strict";
	
	log("reference hash:", hash);
	return;
}).catch(function(error){
	"use strict";
	
	log("%cX", "color: red", "Unable to compute reference hash:", error);
});