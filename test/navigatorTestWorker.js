(function(){
	"use strict";
	
	const values = {};
	const navigator = self.navigator;
	Object.keys(navigator.__proto__).sort().forEach(function(property){
		const value = navigator[property];
		if ((typeof value) === "string"){
			values[property] = value;
		}
	});
	if (self.postMessage){
		self.postMessage(values);
	}
	self.addEventListener("connect", function(event){
		event.ports.forEach(function(port){
			port.postMessage(values);
		});
	});
	self.addEventListener("message", function(event){
		event.source.postMessage(values);
		return values;
	});
}());