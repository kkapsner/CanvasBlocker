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

function processWorkerNavigatorObject(data, name){
	"use strict";
	processNavigatorObject(data.values, Object.keys(data.values), name);
	if (data.nestedValues){
		processWorkerNavigatorObject(data.nestedValues, "nested " + name);
	}
}

const worker = new Worker("navigatorTestWorker.js", {name: "Worker"});
worker.addEventListener("message", function(event){
	"use strict";
	
	processWorkerNavigatorObject(event.data, "Worker");
	worker.terminate();
});

fetch("navigatorTestWorker.js").then(function(response){
	"use strict";
	
	return response.text();
}).then(function(code){
	"use strict";
	
	const blob = new Blob([code], {type: "text/javascript"});
	const blobWorker = new Worker(URL.createObjectURL(blob), {name: "BlobWorker"});
	blobWorker.addEventListener("message", function(event){
		processWorkerNavigatorObject(event.data, "BlobWorker");
		blobWorker.terminate();
	});
	
	return blobWorker;
}).catch(function(error){
	"use strict";
	
	console.error("Unable to create BlobWorker:", error);
});

const sharedWorker = new SharedWorker("navigatorTestWorker.js", {name: "SharedWorker"});
sharedWorker.port.addEventListener("message", function(event){
	"use strict";
	
	processWorkerNavigatorObject(event.data, "SharedWorker");
	sharedWorker.port.close();
});
sharedWorker.port.start();

navigator.serviceWorker.register("navigatorTestWorker.js").then(function(registration){
	"use strict";
	
	const worker = (registration.active || registration.waiting || registration.installing);
	navigator.serviceWorker.addEventListener("message", function(event){
		processWorkerNavigatorObject(event.data, "ServiceWorker");
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
