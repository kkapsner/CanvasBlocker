/* eslint no-console: off */
(function(){
	"use strict";
	
	function hashToString(hash){
		var chunks = [];
		(new Uint32Array(hash)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	}
	
	function show(container, {url, imageData, isPointInPath}){
		var display = container.querySelector(".display");
		display.src = url;
		display.title = url;
		var buffer = new TextEncoder("utf-8").encode(url);
		Promise.all([
			crypto.subtle.digest("SHA-256", buffer),
			crypto.subtle.digest("SHA-256", imageData.data)
		]).then(function(hashes){
			container.querySelector(".hash").textContent =
				hashToString(hashes[0]) + " / " +
				hashToString(hashes[1]);
		});
		container.querySelector(".isPointInPath").textContent = isPointInPath;
	}
	
	if (location.search !== "?notInitial"){
		try {show(document.getElementById("top"), topTest());}
		catch (e){console.error(e);}
		try {show(document.getElementById("iframe"), iframeTest(document.querySelector("#iframe iframe")));}
		catch (e){console.error(e);}
		try {show(document.getElementById("iframe2"), iframeTest(document.querySelector("#iframe2 iframe")));}
		catch (e){console.error(e);}
		try {show(document.getElementById("iframe3"), iframeTest(document.querySelector("#iframe3 iframe")));}
		catch (e){console.error(e);}
	}
	document.querySelector("#top button").addEventListener("click", function(){
		show(document.getElementById("top"), topTest());
	});
	document.querySelector("#iframe button").addEventListener("click", function(){
		show(document.getElementById("iframe"), iframeTest(document.querySelector("#iframe iframe")));
	});
	document.querySelector("#iframe2 button").addEventListener("click", function(){
		show(document.getElementById("iframe2"), iframeTest(document.querySelector("#iframe2 iframe")));
	});
	document.querySelector("#iframe3 button").addEventListener("click", function(){
		show(document.getElementById("iframe3"), iframeTest(document.querySelector("#iframe3 iframe")));
	});
}());

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

function getIsPointInPath(ctx){
	"use strict";
	ctx.beginPath();
	ctx.moveTo(20, 19);
	ctx.lineTo(40, 19);
	ctx.lineTo(30, 30);
	ctx.closePath();
	ctx.stroke();
	
	return ctx.isPointInPath(30, 19);
}

function topTest(){
	"use strict";
	
	// create window canvas
	var canvas = document.createElement("canvas");
	// draw image in window canvas
	var ctx = draw(canvas);
	return {
		url: canvas.toDataURL(),
		imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
		isPointInPath: getIsPointInPath(ctx)
	};
}

function iframeTest(iframe){
	"use strict";

	// create window canvas
	var canvas = document.createElement("canvas");

	// draw image in window canvas
	draw(canvas);

	// create iframe canvas and ctx
	var iframe_canvas = iframe.contentDocument.createElement("canvas");
	iframe_canvas.setAttribute("width", 220);
	iframe_canvas.setAttribute("height", 30);
	var iframe_ctx = iframe_canvas.getContext("2d");

	// copy image from window canvas to iframe ctx
	iframe_ctx.drawImage(canvas, 0, 0);

	return {
		url: iframe_canvas.toDataURL(),
		imageData: iframe_ctx.getImageData(0, 0, iframe_canvas.width, iframe_canvas.height),
		isPointInPath: getIsPointInPath(iframe_ctx)
	};
}