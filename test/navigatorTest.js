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

function processNavigatorObject(navigator, keys, name){
	"use strict";
	
	keys.sort().forEach(function(property){
		const value = navigator[property];
		if ((typeof value) === "string"){
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
}

iframeAPI.forEachMethod(function(windowToUse, name){
	"use strict";

	const navigator = windowToUse.navigator;
	processNavigatorObject(navigator, Object.keys(navigator.__proto__), name);
});

const worker = new Worker("navigatorTestWorker.js");
worker.addEventListener("message", function(event){
	"use strict";
	
	processNavigatorObject(event.data, Object.keys(event.data), "Worker");
	worker.terminate();
});

const sharedWorker = new SharedWorker("navigatorTestWorker.js");
sharedWorker.port.addEventListener("message", function(event){
	"use strict";
	
	processNavigatorObject(event.data, Object.keys(event.data), "SharedWorker");
	sharedWorker.port.close();
});
sharedWorker.port.start();

navigator.serviceWorker.register("navigatorTestWorker.js").then(function(registration){
	"use strict";
	
	const worker = (registration.active || registration.waiting || registration.installing);
	navigator.serviceWorker.addEventListener("message", function(event){
		processNavigatorObject(event.data, Object.keys(event.data), "ServiceWorker");
		registration.unregister();
	});
	if (worker.state !== "activated"){
		worker.addEventListener("statechange", function(){
			if (worker.state === "activated"){
				worker.postMessage("send");
			}
		});
	}
	else {
		worker.postMessage("send");
	}
	return registration;
}).catch(function(error){
	"use strict";
	console.error("Unable to register service worker:", error);
});
