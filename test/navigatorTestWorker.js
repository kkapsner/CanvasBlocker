(async function(){
	"use strict";
	
	const values = {};
	let nestedValues = false;
	const navigator = self.navigator;
	Object.keys(navigator.__proto__).sort().forEach(function(property){
		const value = navigator[property];
		if ((typeof value) === "string"){
			values[property] = value;
		}
	});
	const storage = await navigator.storage.estimate();
	values.storage_quota = storage.quota.toString(10);
	
	const ports = [];
	const sources = [];
	let sendDelayed = false;
	function sendData(){
		sendDelayed = true;
		if (self.postMessage){
			self.postMessage({values, nestedValues});
		}
		ports.forEach(function(port){
			port.postMessage({values, nestedValues});
		});
		sources.forEach(function(source){
			source.postMessage({values, nestedValues});
		});
	}
	self.addEventListener("connect", function(event){
		event.ports.forEach(function(port){
			ports.push(port);
		});
		if (sendDelayed){
			sendData();
		}
	});
	self.addEventListener("message", function(event){
		sources.push(event.source);
		if (sendDelayed){
			sendData();
		}
	});
	
	if (
		!(self.name && self.name.startsWith("nested nested")) &&
		self.Worker
	){
		const worker = new Worker(self.location, {name: "nested " + (self.name || "")});
		worker.addEventListener("message", function(event){
			nestedValues = event.data;
			worker.terminate();
			sendData();
		});
	}
	else {
		sendData();
	}
}());