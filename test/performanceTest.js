
var createLog = function(){
	"use strict";
	
	var div = document.getElementById("log");
	
	return function createLog(){
		var logDiv = document.createElement("div");
		logDiv.className = "log";
		div.appendChild(logDiv);
		return function createLine(str){
			var logLine = document.createElement("div");
			logLine.className = "logLine";
			logDiv.appendChild(logLine);
			logLine.textContent = str;
			return function updateLine(str){
				logLine.textContent = str;
			};
		};
	};
}();

var performTest = function(){
	"use strict";
	
	return function performTest(name, func, innerRunLength, outerRunLength){
		var log = createLog();
		log("test " + name);
		var line = log("starting");
		var time = 0;
		var time2 = 0;
		var min = Number.POSITIVE_INFINITY;
		var max = 0;
		var outerI = 0;
		function run(){
			for (var i = 0; i < innerRunLength; i += 1){
				func.prepare();
				var start = performance.now();
				func.test();
				var end = performance.now();
				var duration = end - start;
				min = Math.min(min, duration);
				max = Math.max(max, duration);
				time2 += duration * duration;
				time += duration;
			}
			outerI += 1;
			var totalRunI = outerI * innerRunLength;
			line(
				"finished run " + totalRunI + " from " + (innerRunLength * outerRunLength) +
				" -> average: " + (time / totalRunI).toFixed(2) + "ms" +
				"(min: " + min.toFixed(2) + "ms, max: " + max.toFixed(2) + "ms)"
			);
			if (outerI < outerRunLength){
				window.setTimeout(run, 10);
			}
			else {
				log("finished");
			}
		}
		window.setTimeout(run, 10);
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

var fingerprintTest = function(){
	"use strict";
	
	var canvas;
	return {
		prepare: function(){
			// create window canvas
			canvas = document.createElement("canvas");
			// draw image in window canvas
			draw(canvas);
		},
		test: function fingerprintTest(){
			return canvas.toDataURL();
		}
	};
}();

var randomImageTest = function(){
	"use strict";
	
	var canvas;
	
	return {
		prepare: function(){
			canvas = document.createElement("canvas");
			canvas.width = 1000;
			canvas.height = 100;
			var imageData = new ImageData(canvas.width, canvas.height);
			var data = imageData.data;
			
			for (var i = 0; i < data.length; i += 4){
				data[i + 0] = Math.floor(256 * Math.random());
				data[i + 1] = Math.floor(256 * Math.random());
				data[i + 2] = Math.floor(256 * Math.random());
				data[i + 3] = 255;
			}
			
			canvas.getContext("2d").putImageData(imageData, 0, 0);
		},
		test: function randomImageTest(){
			return canvas.toDataURL();
		}
	};
}();

performTest("fingerprinting", fingerprintTest, 10, 100);
performTest("big random image", randomImageTest, 10, 10);