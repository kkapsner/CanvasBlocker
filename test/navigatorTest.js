
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
				mark: function mark(index){
					logLine.classList.add("marked");
					logLine.title += "failed test " + index + "\n";
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
const iframeValues = [
	function(){
		"use strict";
		
		return {windowToUse: window, cleanup: function(){}};
	},
	function(){
		"use strict";
		
		const iframe = document.createElement("iframe");
		document.body.appendChild(iframe);
		const windowToUse = frames[frames.length - 1];
		return {windowToUse, cleanup: function(){document.body.removeChild(iframe);}};
	},
	function(){
		"use strict";
		
		const iframe = document.createElement("iframe");
		document.body.appendChild(iframe);
		const windowToUse = window[window.length - 1];
		return {windowToUse, cleanup: function(){document.body.removeChild(iframe);}};
	},
	function(){
		"use strict";
		
		const index = window.length;
		const iframe = document.createElement("iframe");
		document.body.appendChild(iframe);
		const windowToUse = window[index];
		return {windowToUse, cleanup: function(){document.body.removeChild(iframe);}};
	}
].forEach(function(getWindow, index){
	"use strict";
	
	const {windowToUse, cleanup} = getWindow();

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
				propertyLine.log.mark(index);
			}
		}
	});
	cleanup();
});
