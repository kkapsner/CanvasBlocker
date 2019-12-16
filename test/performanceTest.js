
const createLog = function(){
	"use strict";
	
	const div = document.getElementById("log");
	
	return function createLog(){
		const logDiv = document.createElement("div");
		logDiv.className = "log";
		div.appendChild(logDiv);
		return {
			createButton: function createButton(text, callback){
				const button = document.createElement("button");
				button.className = "logButton";
				logDiv.appendChild(button);
				button.textContent = text;
				button.addEventListener("click", callback);
			},
			createLine: function createLine(str, type = "div"){
				const logLine = document.createElement(type);
				logLine.className = "logLine";
				logDiv.appendChild(logLine);
				logLine.textContent = str;
				return function updateLine(str){
					logLine.textContent = str;
				};
			}
		};
	};
}();

const performTest = function(){
	"use strict";
	
	return function performTest(name, func, innerRunLength, outerRunLength){
		const log = createLog();
		log.createLine("test " + name, "h3");
		const line = log.createLine("");
		let line2;
		let time = 0;
		let time2 = 0;
		let min = Number.POSITIVE_INFINITY;
		let max = 0;
		let outerI = 0;
		const outerRunIncrease = outerRunLength;
		if (func.prepareOnce){
			func.prepareOnce();
		}
		log.createButton("measure", function(){
			line("starting");
			line2("");
			function run(){
				for (let i = 0; i < innerRunLength; i += 1){
					if (func.prepare){
						func.prepare();
					}
					const start = performance.now();
					func.test();
					const end = performance.now();
					const duration = end - start;
					min = Math.min(min, duration);
					max = Math.max(max, duration);
					time2 += duration * duration;
					time += duration;
				}
				outerI += 1;
				const totalRunI = outerI * innerRunLength;
				line(
					"finished run " + totalRunI + " from " + (innerRunLength * outerRunLength) +
					" -> average: " + (time / totalRunI).toFixed(2) +
					"(\u00B1" + Math.sqrt((time2 - time * time / totalRunI) / totalRunI).toFixed(2) + ") ms " +
					"(min: " + min.toFixed(2) + "ms, max: " + max.toFixed(2) + "ms)"
				);
				if (outerI < outerRunLength){
					window.setTimeout(run, 10);
				}
				else {
					outerRunLength += outerRunIncrease;
					line2("finished");
				}
			}
			window.setTimeout(run, 10);
		});
		line2 = log.createLine("");
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

const fingerprintTest = function(){
	"use strict";
	
	let canvas;
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

const randomImageTest = function(){
	"use strict";
	
	let canvas;
	
	return {
		prepare: function(){
			canvas = document.createElement("canvas");
			canvas.width = 1000;
			canvas.height = 100;
			const imageData = new ImageData(canvas.width, canvas.height);
			const data = imageData.data;
			
			for (let i = 0; i < data.length; i += 4){
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

const innerHTMlTest = function(html, repeats){
	"use strict";
	
	let div;
	
	return {
		prepareOnce: function(){
			div = document.createElement("div");
			div.style.visibility = "hidden";
			document.body.appendChild(div);
		},
		test: function randomImageTest(){
			for (let i = repeats; i--;){
				div.innerHTML = html;
				div.innerHTML = "";
			}
		}
	};
};

performTest("fingerprinting", fingerprintTest, 10, 100);
performTest("big random image", randomImageTest, 10, 10);
performTest("innerHTML (100 times)", innerHTMlTest("text <br>no iframe", 1000), 10, 30);
performTest("innerHTML with iframe (20 times)", innerHTMlTest("text <br>iframe: <iframe></iframe>", 20), 10, 10);