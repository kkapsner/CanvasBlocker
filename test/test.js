(function(){
	"use strict";
	
	function hashToString(hash){
		const chunks = [];
		(new Uint32Array(hash)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	}
	
	async function show(container, {url, imageData, isPointInPath}){
		const display = container.querySelector(".display");
		display.src = url;
		display.title = url;
		const buffer = new TextEncoder("utf-8").encode(url);
		const hashes = await Promise.all([
			crypto.subtle.digest("SHA-256", buffer),
			crypto.subtle.digest("SHA-256", imageData.data)
		]);
		container.querySelector(".hash").textContent =
			hashToString(hashes[0]) + " / " +
			hashToString(hashes[1]);
		container.querySelector(".isPointInPath").textContent = isPointInPath;
	}
	
	if (location.search !== "?notInitial"){
		try {show(document.getElementById("top"), topTest());}
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe"), iframeTest(document.querySelector("#iframe iframe")));}
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe2"), iframeTest(document.querySelector("#iframe2 iframe")));}
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe3"), iframeTest(document.querySelector("#iframe3 iframe")));}
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe4"), dynamicIframeTest1());}
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe5"), dynamicIframeTest2());}
		catch (error){console.error(error);}
		try {show(document.getElementById("iframe6"), dynamicIframeTest3());}
		catch (error){console.error(error);}
		window.addEventListener("click", function windowOpenTest(){
			window.removeEventListener("click", windowOpenTest);
			const newWindow = window.open("/");
			try{
				show(document.getElementById("windowOpen"), copyToDifferentDocumentTest(newWindow.document));
			}
			catch (error){
				console.error(error);
			}
			newWindow.close();
		});
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
	document.querySelector("#windowOpen button").addEventListener("click", function(){
		const newWindow = window.open("/");
		show(document.getElementById("windowOpen"), copyToDifferentDocumentTest(newWindow.document));
		newWindow.close();
	});
}());

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
	const canvas = document.createElement("canvas");
	// draw image in window canvas
	const ctx = draw(canvas);
	return {
		imageData: ctx.getImageData(0, 0, canvas.width, canvas.height),
		url: canvas.toDataURL(),
		isPointInPath: getIsPointInPath(ctx)
	};
}

function copyToDifferentDocumentTest(otherDocument){
	"use strict";

	// create window canvas
	const canvas = document.createElement("canvas");

	// draw image in window canvas
	draw(canvas);

	// create other canvas and context
	const otherCanvas = otherDocument.createElement("canvas");
	otherCanvas.setAttribute("width", 220);
	otherCanvas.setAttribute("height", 30);
	const otherContext = otherCanvas.getContext("2d");

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
	
	const length = frames.length;
	const iframe = document.createElement("iframe");
	document.body.appendChild(iframe);
	const iframeWindow = frames[length];
	document.body.removeChild(iframe);
	return copyToDifferentDocumentTest(iframeWindow.document);
}

function dynamicIframeTest2(){
	"use strict";
	
	const length = window.length;
	const iframe = document.createElement("iframe");
	document.body.appendChild(iframe);
	const iframeWindow = window[length];
	document.body.removeChild(iframe);
	return copyToDifferentDocumentTest(iframeWindow.document);
}

function dynamicIframeTest3(){
	"use strict";
	
	const length = window.length;
	const div = document.createElement("div");
	document.body.appendChild(div);
	div.innerHTML = "<iframe></iframe>";
	const iframeWindow = window[length];
	document.body.removeChild(div);
	return copyToDifferentDocumentTest(iframeWindow.document);
}