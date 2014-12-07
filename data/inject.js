/* global self, window, console, unsafeWindow, exportFunction */
(function(){
	"use strict";
	
	var blockMode = {
		getContext: {
			status: "block",
			askText: "askForPermission",
			askStatus: {
				askOnce: false,
				alreadyAsked: false,
				answer: null
			}
		},
		readAPI: {
			status: "allow",
			askText: "askForReadoutPermission",
			askStatus: {
				askOnce: false,
				alreadyAsked: false,
				answer: null
			}
		}
	};
	
	var undef;
	var randomImage = (function(){
		var length = Math.floor(20 + Math.random() * 100);
		var bytes = "";
		for (var i = 0; i < length; i += 1){
			bytes += String.fromCharCode(Math.floor(Math.random() * 256));
		}
		return bytes;
	}());
	
	// changed functions
	var changedFunctions = {
		getContext: {
			mode: blockMode.getContext,
			object: unsafeWindow.HTMLCanvasElement
		},
		toDataURL: {
			mode: blockMode.readAPI,
			object: unsafeWindow.HTMLCanvasElement,
			fake: function(){
				var type = arguments[0] || "image/png";
				return "data:" + type + ";base64," + btoa(randomImage);
			}
		},
		toBlob: {
			mode: blockMode.readAPI,
			object: unsafeWindow.HTMLCanvasElement,
			fake: function(callback){
				var type = arguments[0] || "image/png";
				var blob = new window.Blob(randomImage, {type: type});
				callback(blob);
			},
			exportOptions: {allowCallbacks: true}
		},
		mozGetAsFile: {
			mode: blockMode.readAPI,
			object: unsafeWindow.HTMLCanvasElement
		},
		getImageData: {
			mode: blockMode.readAPI,
			object: unsafeWindow.CanvasRenderingContext2D,
			fake: function(sx, sy, sw, sh){
				var l = sw * sh * 4;
				var data = new Uint8ClampedArray(l);
				for (var i = 0; i < l; i += 1){
					data[i] = Math.floor(
						Math.random() * 256
					);
				}
				var imageData = new window.ImageData(sw, sh);
				imageData.data.set(cloneInto(data, unsafeWindow));
				return imageData;
			}
		},
		readPixels: {
			mode: blockMode.readAPI,
			object: unsafeWindow.WebGLRenderingContext
		}
	};
	
	Object.keys(changedFunctions).forEach(function(name){
		var changedFunction = changedFunctions[name];
		var original = changedFunction.object.prototype[name];
		Object.defineProperty(
			changedFunction.object.prototype,
			name,
			{
				enumerable: true,
				configureable: false,
				get: exportFunction(function(){
					var status = changedFunction.mode.status;
					if (status === "ask"){
						var askStatus = changedFunction.mode.askStatus;
						if (askStatus.askOnce && askStatus.alreadyAsked){
							// console.log("already asked");
							status = askStatus.answer;
						}
						else {
							//unsafeWindow.console.log("asking");
							var callers = new Error().stack.split('\n');
							var findme = callers.shift(); // Remove us from the stack
							findme = findme.replace(/(:[0-9]+){1,2}$/, ""); // rm line & column
							// Eliminate squashed stack. stack may contain 2+ stacks, but why...
							for (var i = 0; callers[i]; i++){
								if (callers[i].search(findme) == 0){
									callers.splice(i, callers.length - i);
									break;
								}
							}
							var msg = _(changedFunction.mode.askText);
							if (changedFunction.mode.askText === "askForReadoutPermission"){
								msg += "\n\nCaller: " + callers[0];
								// maybe show full stack here if some pref
								//msg += "\n\nFull stack: \n" + callers.join('\n');
							}
							status = window.confirm(msg) ? "allow": "block";
							askStatus.alreadyAsked = true;
							askStatus.answer = status;
							//unsafeWindow.console.log("asking (done)");
						}
					}
					switch (status){
						case "allow":
							return original;
						case "fake":
							return changedFunction.fake? exportFunction(
								changedFunction.fake,
								unsafeWindow,
								changedFunction.exportOptions
							): undef;
						case "block":
						default:
							return undef;
					}
				}, unsafeWindow)
			}
		);
	});
	
	// Translation
	var _ = function(name){
		return _[name] || name;
	};
	self.port.on("setTranslation", function(name, translation){
		_[name] = translation;
	});
	
	// Communication with main.js
	
	function checkPDF(blocking){
		if (document.contentType.match(/\/pdf$/i)){
			self.port.emit("isPDF", blocking);
			return true;
		}
		return false;
	}
	
	self.port.on("block", function(force){
		if (force || !checkPDF("block")){
			blockMode.getContext.status = "block";
			blockMode.readAPI.status = "allow";
		}
	});
	self.port.on("ask", function(force, askOnce){
		if (force || !checkPDF("askVisible")){
			blockMode.getContext.status = "ask";
			blockMode.getContext.askStatus.askOnce = askOnce;
			blockMode.readAPI.status = "allow";
		}
	});
	self.port.on("blockReadout", function(force){
		if (force || !checkPDF("blockReadout")){
			blockMode.getContext.status = "allow";
			blockMode.readAPI.status = "block";
		}
	});
	self.port.on("fakeReadout", function(force){
		if (force || !checkPDF("fakeReadout")){
			blockMode.getContext.status = "allow";
			blockMode.readAPI.status = "fake";
		}
	});
	self.port.on("askReadout", function(force, askOnce){
		if (force || !checkPDF("askReadout")){
			blockMode.getContext.status = "allow";
			blockMode.readAPI.status = "ask";
			blockMode.readAPI.askStatus.askOnce = askOnce;
		}
	});
	self.port.on("unblock", function(){
		blockMode.getContext.status = "allow";
		blockMode.readAPI.status = "allow";
	});
	self.port.on("detach", function(){
		blockMode.getContext.status = "allow";
		blockMode.readAPI.status = "allow";
	});
}());
