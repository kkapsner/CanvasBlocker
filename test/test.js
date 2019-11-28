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
			return;
		}).catch(function(error){
			container.querySelector(".hash").textContent = "Error while calculating hash: " + error;
		});
		container.querySelector(".isPointInPath").textContent = isPointInPath;
	}
	
	if (location.search !== "?notInitial"){
		try {show(document.getElementById("top"), topTest());}
		// eslint-disable-next-line no-console
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe"), iframeTest(document.querySelector("#iframe iframe")));}
		// eslint-disable-next-line no-console
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe2"), iframeTest(document.querySelector("#iframe2 iframe")));}
		// eslint-disable-next-line no-console
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe3"), iframeTest(document.querySelector("#iframe3 iframe")));}
		// eslint-disable-next-line no-console
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe4"), dynamicIframeTest1());}
		// eslint-disable-next-line no-console
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe5"), dynamicIframeTest2());}
		// eslint-disable-next-line no-console
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe6"), dynamicIframeTest3());}
		// eslint-disable-next-line no-console
		catch (error){console.error(error);}
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
	document.querySelector("#iframe4 button").addEventListener("click", function(){
		show(document.getElementById("iframe4"), dynamicIframeTest1());
	});
	document.querySelector("#iframe5 button").addEventListener("click", function(){
		show(document.getElementById("iframe5"), dynamicIframeTest2());
	});
	document.querySelector("#iframe6 button").addEventListener("click", function(){
		show(document.getElementById("iframe6"), dynamicIframeTest3());
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
		imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
		url: canvas.toDataURL(),
		isPointInPath: getIsPointInPath(ctx)
	};
}

function copyToDifferentDocumentTest(otherDocument){
	"use strict";

	// create window canvas
	var canvas = document.createElement("canvas");

	// draw image in window canvas
	draw(canvas);

	// create other canvas and context
	var otherCanvas = otherDocument.createElement("canvas");
	otherCanvas.setAttribute("width", 220);
	otherCanvas.setAttribute("height", 30);
	var otherContext = otherCanvas.getContext("2d");

	// copy image from window canvas to iframe context
	otherContext.drawImage(canvas, 0, 0);

	return {
		imageData: otherContext.getImageData(0, 0, otherCanvas.width, otherCanvas.height),
		url: otherCanvas.toDataURL(),
		isPointInPath: getIsPointInPath(otherContext)
	};
}

function iframeTest(iframe){
	"use strict";
	
	return copyToDifferentDocumentTest(iframe.contentDocument);
}

function dynamicIframeTest1(){
	"use strict";
	
	var length = frames.length;
	var iframe = document.createElement("iframe");
	document.body.appendChild(iframe);
	var iframeWindow = frames[length];
	document.body.removeChild(iframe);
	return copyToDifferentDocumentTest(iframeWindow.document);
}

function dynamicIframeTest2(){
	"use strict";
	
	var length = window.length;
	var iframe = document.createElement("iframe");
	document.body.appendChild(iframe);
	var iframeWindow = window[length];
	document.body.removeChild(iframe);
	return copyToDifferentDocumentTest(iframeWindow.document);
}

function dynamicIframeTest3(){
	"use strict";
	
	var length = window.length;
	var div = document.createElement("div");
	document.body.appendChild(div);
	div.innerHTML = "<iframe></iframe>";
	var iframeWindow = window[length];
	document.body.removeChild(div);
	return copyToDifferentDocumentTest(iframeWindow.document);
}