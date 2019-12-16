
const createLog = function(){
	"use strict";
	
	const div = document.getElementById("log");
	
	return function createLog(){
		const logDiv = document.createElement("div");
		logDiv.className = "log";
		div.appendChild(logDiv);
		return function createLine(str){
			const logLine = document.createElement("div");
			logLine.className = "logLine";
			logDiv.appendChild(logLine);
			logLine.textContent = str;
			return function updateLine(str){
				logLine.textContent = str;
			};
		};
	};
}();

let log = createLog();

log("user agent equal between server and client: " + (
	document.getElementById("serverUserAgent").text === navigator.userAgent
));

Object.keys(navigator.__proto__).sort().forEach(function(property){
	"use strict";
	
	const value = navigator[property];
	if ((typeof value) === "string"){
		log(property + ": " + value);
	}
});

const section = document.createElement("h2");
section.textContent = "Values in iFrame";
document.getElementById("log").append(section);

log = createLog();

const iframe = document.createElement("iframe");
document.body.appendChild(iframe);
const iframeWindow = frames[frames.length - 1];

Object.keys(navigator.__proto__).sort().forEach(function(property){
	"use strict";
	
	const value = iframeWindow.navigator[property];
	if ((typeof value) === "string"){
		log(property + "@iframe: " + value);
	}
});
document.body.removeChild(iframe);