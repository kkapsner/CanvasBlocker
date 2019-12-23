/* globals iframeAPI*/
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
			return {
				update: function updateLine(str){
					str = str.replace("{old content}", logLine.textContent);
					logLine.textContent = str;
				},
				mark: function mark(marktext){
					logLine.classList.add("marked");
					logLine.title += marktext + "\n";
				}
			};
		};
	};
}();

const log = createLog();

const userAgentIsConsistent = document.getElementById("serverUserAgent").text === navigator.userAgent;
const consistencyLine = log("user agent equal between server and client: " + userAgentIsConsistent);
if (!userAgentIsConsistent){
	consistencyLine.mark();
}
const lines = {};

iframeAPI.forEachMethod(function(windowToUse, name){
	"use strict";

	const navigator = windowToUse.navigator;
	Object.keys(navigator.__proto__).sort().forEach(function(property){
		const value = navigator[property];
		if ((typeof value) === "string"){
			const isFirst = !lines[property];
			if (!lines[property]){
				lines[property] = {
					values: [],
					log: log(property + ": ")
				};
			}
			const propertyLine = lines[property];
			if (propertyLine.values.indexOf(value) === -1){
				propertyLine.log.update("{old content}" + (propertyLine.values.length? " | ": "") + value);
				propertyLine.values.push(value);
			}
			if (propertyLine.values[0] !== value){
				propertyLine.log.mark("failed test " + name);
			}
		}
	});
});
