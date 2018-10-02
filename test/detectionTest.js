/* eslint no-console: off, max-lines: off */
var addTest = (function(){
	"use strict";

	var statusDefinitions = [
		{className: "notRun", text: "not run"},
		{className: "loud", text: "CB detected"},
		{className: "stealthy", text: "CB not detected"},
		{className: "failed", text: "test failed"}
	];
	var ul = document.getElementById("tests");
	return function addTest(name, func){
		var logs = [];
		function log(){
			logs.push(Array.prototype.slice.call(arguments).join(" "));
		}
		var status = 0;
		try {
			status = func(log)? 1: 2;
		}
		catch (e){
			console.log(e);
			status = 3;
		}
		var li = document.createElement("li");
		li.className = statusDefinitions[status].className;
		var nameNode = document.createElement("span");
		nameNode.className = "name";
		nameNode.textContent = name;
		nameNode.title = func.toString();
		li.appendChild(nameNode);
		li.appendChild(document.createTextNode(": "));
		var statusNode = document.createElement("span");
		statusNode.className = "status";
		statusNode.textContent = statusDefinitions[status].text;
		statusNode.title = logs.join("\n");
		li.appendChild(statusNode);
		ul.appendChild(li);
		return li;
	};
}());

function checkPropertyDescriptor(object, name, expectedDescriptor, log){
	"use strict";
	var descriptor = Object.getOwnPropertyDescriptor(object, name);
	var detected = false;
	
	function logProperty(desc, got, expected){
		log("Wrong", desc, "for", name, "- got:", got, "- expected: ", expected);
	}
	function compare(desc, getter){
		var got = getter(descriptor);
		var expected = getter(expectedDescriptor);
		
		if ((typeof expected) === "function"){
			if (got.name !== expected.name){
				detected = true;
				logProperty(desc + " (function name)", expected.name, got.name);
			}
			if (got.length !== expected.length){
				detected = true;
				logProperty(desc + " (function length)", expected.length, got.length);
			}
			const re = "^\\s*function " + expected.name + "\\s*\\(\\)\\s*\\{\\s*\\[native code\\]\\s*\\}\\s*$";
			if (!got.toString().match(new RegExp(re))){
				detected = true;
				logProperty(desc + " (function string)", re, got.toString());
			}
		}
		else if (got !== expected){
			logProperty(desc, got, expected);
			detected = true;
		}
	}
	
	compare("descriptor type", function(v){return typeof v;});
	if (descriptor){
		Object.keys(descriptor).forEach(function(key){
			compare(key, function(v){return v[key];});
		});
	}
	return detected;
}

addTest("function length", function(log){
	"use strict";
	
	if (CanvasRenderingContext2D.prototype.getImageData.length !== 4){
		log("expected 4 parameters for getImageData - got", CanvasRenderingContext2D.prototype.getImageData.length);
		return true;
	}
	else {
		return false;
	}
});
addTest("function code", function(log){
	"use strict";
	var codeDetected = false;
	function checkFunctionCode(func, expectedName){
		log("checking", expectedName);
		if (!func.toString().match(
			new RegExp("^\\s*function " + expectedName + "\\s*\\(\\)\\s*\\{\\s*\\[native code\\]\\s*\\}\\s*$")
		)){
			log("unexpected function code:", func.toString());
			return true;
		}
		return false;
	}
	codeDetected = checkFunctionCode(
		CanvasRenderingContext2D.prototype.getImageData,
		"getImageData"
	) || codeDetected;
	codeDetected = checkFunctionCode(
		HTMLCanvasElement.prototype.toDataURL,
		"toDataURL"
	) || codeDetected;
	codeDetected = checkFunctionCode(
		history.__lookupGetter__("length"),
		"(get )?length"
	) || codeDetected;
	codeDetected = checkFunctionCode(
		window.__lookupGetter__("name"),
		"(get )?name"
	) || codeDetected;
	codeDetected = checkFunctionCode(
		window.__lookupSetter__("name"),
		"(set )?name"
	) || codeDetected;
	return codeDetected;
});
addTest("toString modified", function(log){
	"use strict";
	return checkPropertyDescriptor(
		HTMLCanvasElement.prototype.toDataURL,
		"toString",
		undefined,
		log
	) | checkPropertyDescriptor(
		Object.prototype,
		"toString",
		{
			value: function toString(){},
			writable: true,
			enumerable: false,
			configurable: true
		},
		log
	);
});
addTest("function name", function(log){
	"use strict";
	
	function checkName({func, expectedName}){
		if (func.name !== expectedName){
			log("unexpected function name: " + func.name + " !== " + expectedName);
			return true;
		}
		else {
			return false;
		}
	}
	
	return [
		{
			func: HTMLCanvasElement.prototype.toDataURL,
			expectedName: "toDataURL"
		},
		{
			func: CanvasRenderingContext2D.prototype.getImageData,
			expectedName: "getImageData"
		},
		{
			func: history.__lookupGetter__("length"),
			expectedName: "get length"
		},
		{
			func: window.__lookupGetter__("name"),
			expectedName: "get name"
		},
		{
			func: window.__lookupSetter__("name"),
			expectedName: "set name"
		},
	].map(checkName).some(function(b){return b;});
});
addTest("property descriptor", function(log){
	"use strict";
	
	const properties = [
		{
			object: CanvasRenderingContext2D.prototype,
			name: "getImageData",
			descriptor: {
				value: function getImageData(x, y, w, h){},
				writable: true,
				enumerable: true,
				configurable: true
			}
		},
		{
			object: HTMLCanvasElement.prototype,
			name: "toDataURL",
			descriptor: {
				value: function toDataURL(){},
				writable: true,
				enumerable: true,
				configurable: true
			}
		},
		{
			object: Element.prototype,
			name: "getClientRects",
			descriptor: {
				value: function getClientRects(){},
				writable: true,
				enumerable: true,
				configurable: true
			}
		},
	];
	
	return properties.reduce(function(pass, property){
		return checkPropertyDescriptor(property.object, property.name, property.descriptor, log) || pass;
	}, false);
});
addTest("error provocation 1", function(log){
	"use strict";
	
	var canvas = document.createElement("canvas");
	var ctx = canvas.getContext("2d");
	var canvasBlocker = false;
	try{
		ctx.getImageData(0, 0, 0, 0);
	}
	catch (err){
		try {
			log(err.name);
			log(err.toString());
		}
		catch (e){
			canvasBlocker = true;
		}
	}
	return canvasBlocker;
});
addTest("error provocation 2", function(log){
	"use strict";
	
	var canvas = document.createElement("canvas");
	canvas.width = 0;
	var ctx = canvas.getContext("2d");
	var canvasBlocker = false;
	try{
		ctx.getImageData(0, 0, 1, 1);
		log("no error provoked");
	}
	catch (err){
		try {
			log(err.name);
			log(err.toString());
		}
		catch (e){
			canvasBlocker = true;
		}
	}
	return canvasBlocker;
});
addTest("error provocation 3", function(log){
	"use strict";
	
	var canvasBlocker = false;
	try{
		CanvasRenderingContext2D.prototype.getImageData.apply(undefined, [0, 0, 1, 1]);
	}
	catch (err){
		try {
			log(err.name);
			log(err.toString());
		}
		catch (e){
			canvasBlocker = true;
		}
	}
	return canvasBlocker;
});
addTest("error properties", function(log){
	"use strict";
	
	var canvasBlocker = false;
	try{
		CanvasRenderingContext2D.prototype.getImageData.apply(undefined, [0, 0, 1, 1]);
	}
	catch (err){
		try {
			var name = "TypeError";
			if (err.name !== name && err instanceof TypeError){
				log("Error name wrong. Expected: ", name, "- got:", err.name);
				canvasBlocker = true;
			}
			var start = "@" + location.href.replace(/\.html$/, ".js");
			if (!err.stack.startsWith(start)){
				log("Error stack starts wrong. Expected:", start, "- got :", err.stack.split(/\n/g, 2)[0]);
				canvasBlocker = true;
			}
			var message = "'getImageData' called on an object that " +
				"does not implement interface CanvasRenderingContext2D.";
			if (err.message !== message){
				log("Error message wrong. Expected: ", message, "- got:", err.message);
				canvasBlocker = true;
			}
		}
		catch (e){
			canvasBlocker = true;
		}
	}
	return canvasBlocker;
});
function testKnownPixelValue(size, log){
	"use strict";
	
	var canvas = document.createElement("canvas");
	canvas.height = size;
	canvas.width = size;
	var context = canvas.getContext("2d");
	var imageData = new ImageData(canvas.width, canvas.height);
	var pixelValues = imageData.data;
	for (let i = 0; i < imageData.data.length; i += 1){
		if (i % 4 !== 3){
			pixelValues[i] = Math.floor(256 * Math.random());
		}
		else {
			pixelValues[i] = 255;
		}
	}
	context.putImageData(imageData, 0, 0);
	var p = context.getImageData(0, 0, canvas.width, canvas.height).data;
	for (var i = 0; i < p.length; i += 1){
		if (p[i] !== pixelValues[i]){
			log("wrong value", p[i], "at", i, "expected", pixelValues[i]);
			return true;
		}
	}
	return false;
}
addTest("known pixel value test 1", function(log){
	"use strict";
	
	return testKnownPixelValue(1, log);
});
addTest("known pixel value test 10", function(log){
	"use strict";
	
	return testKnownPixelValue(10, log);
});
addTest("double readout test", function(log){
	"use strict";
	
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");
	var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	for (let i = 0; i < imageData.data.length; i += 1){
		if (i % 4 !== 3){
			imageData.data[i] = Math.floor(256 * Math.random());
		}
		else {
			imageData.data[i] = 255;
		}
	}
	context.putImageData(imageData, 0, 0);
	
	var imageData1 = context.getImageData(0, 0, canvas.width, canvas.height);
	var imageData2 = context.getImageData(0, 0, canvas.width, canvas.height);
	for (let i = 0; i < imageData2.data.length; i += 1){
		if (imageData1.data[i] !== imageData2.data[i]){
			log("mismatch at", i, ":",
				imageData1.data[i], "(", imageData1.data[i].toString(2), ")",
				"!=",
				imageData2.data[i], "(", imageData2.data[i].toString(2), ")",
				"| original:", imageData.data[i], "(", imageData.data[i].toString(2), ")"
			);
			return true;
		}
	}
	return false;
});
addTest("double readout test (toDataURL)", function(log){
	"use strict";
	
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");
	var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	for (let i = 0; i < imageData.data.length; i += 1){
		if (i % 4 !== 3){
			imageData.data[i] = Math.floor(256 * Math.random());
		}
		else {
			imageData.data[i] = 255;
		}
	}
	context.putImageData(imageData, 0, 0);
	
	var dataURL1 = canvas.toDataURL();
	var dataURL2 = canvas.toDataURL();
	if (dataURL1 !== dataURL2){
		log("data URL missmatch:",
			dataURL1,
			"!=",
			dataURL2
		);
		return true;
	}
	return false;
});
addTest("readout - in - out test", function(log){
	"use strict";
	
	var canvas = document.createElement("canvas");
	var context = canvas.getContext("2d");
	var imageData = context.getImageData(0, 0, canvas.width, canvas.height);
	for (let i = 0; i < imageData.data.length; i += 1){
		if (i % 4 !== 3){
			imageData.data[i] = Math.floor(256 * Math.random());
		}
		else {
			imageData.data[i] = 255;
		}
	}
	context.putImageData(imageData, 0, 0);
	
	var imageData1 = context.getImageData(0, 0, canvas.width, canvas.height);
	var canvas2 = document.createElement("canvas");
	var context2 = canvas2.getContext("2d");
	context2.putImageData(imageData1, 0, 0);
	var imageData2 = context2.getImageData(0, 0, canvas.width, canvas.height);
	for (let i = 0; i < imageData2.data.length; i += 1){
		if (imageData1.data[i] !== imageData2.data[i]){
			log("mismatch at", i, ":",
				imageData1.data[i], "(", imageData1.data[i].toString(2), ")",
				"!=",
				imageData2.data[i], "(", imageData2.data[i].toString(2), ")"
			);
			return true;
		}
	}
	return false;
});

addTest("window name change", function(log){
	"use strict";
	
	var oldName = window.name;
	log("old name:", oldName);
	var newName = oldName + " added";
	log("new name:", newName);
	window.name = newName;
	
	if (window.name !== newName){
		log("window name not set:", window.name);
		return true;
	}
	return false;
});

function checkDOMRectData(rect, data, log){
	"use strict";
	
	var detected = false;
	["x", "y", "width", "height"].forEach(function(property){
		if (data[property] !== rect[property]){
			log("Wrong value for", property, ":", data[property], "!=", rect[property]);
			detected = true;
		}
	});
	return detected;
}

function getRectByData(data){
	"use strict";
	
	var el = document.createElement("div");
	el.style.cssText = "position: fixed;" +
		"left: " + data.x + "px; " +
		"top: " + data.y + "px; " +
		"width: " + data.width + "px; " +
		"height: " + data.height + "px;";
	
	document.body.appendChild(el);
	var rect = el.getBoundingClientRect();
	document.body.removeChild(el);
	return rect;
}

addTest("self created DOMRect", function(log){
	"use strict";
	
	var data = {
		x: Math.PI,
		y: Math.E,
		width: Math.LOG10E,
		height: Math.LOG2E
	};
	var rect = new DOMRect(data.x, data.y, data.width, data.height);
	return checkDOMRectData(rect, data, log);
});

addTest("known DOMRect", function(log){
	"use strict";
	
	var data = {
		x: 1 + 1/4,
		y: 2,
		width: 3,
		height: 4
	};
	
	var rect = getRectByData(data);
	
	return checkDOMRectData(rect, data, log);
});
addTest("changed DOMRect", function(log){
	"use strict";
	
	var data = {
		x: Math.PI,
		y: 2,
		width: 3,
		height: 4
	};
	
	var rect = getRectByData(data);
	rect.x = Math.PI;
	
	return checkDOMRectData(rect, data, log);
});
addTest("recreated DOMRect", function(log){
	"use strict";
	
	var data = {
		x: Math.PI,
		y: Math.E,
		width: Math.LOG10E,
		height: Math.LOG2E
	};
	
	var rect = getRectByData(data);
	var rect2 = getRectByData(rect);
	
	return checkDOMRectData(rect2, rect, log);
});