/* global self, window, console, unsafeWindow, exportFunction */
(function(){
	"use strict";
	
	var blockMode = {
		getContext: {
			status: "block",
			askStatus: {
				askOnce: false,
				alreadyAsked: false,
				answer: null
			}
		},
		readAPI: {
			status: "allow",
			askStatus: {
				askOnce: false,
				alreadyAsked: false,
				answer: null
			}
		}
	};
	
	var undef;
	var originalGetContext = unsafeWindow.HTMLCanvasElement.prototype.getContext;
	Object.defineProperty(
		unsafeWindow.HTMLCanvasElement.prototype,
		"getContext",
		{
			enumerable: true,
			configureable: false,
			get: exportFunction(function(){
				switch (blockMode.getContext.status){
					case "allow":
						// console.log("allow");
						return originalGetContext;
					case "ask":
						// console.log("ask");
						var status = blockMode.getContext.askStatus;
						var allow;
						if (status.askOnce && status.alreadyAsked){
							// console.log("already asked");
							allow = status.answer;
						}
						else {
							// console.log("asking");
							allow = window.confirm(_("askForPermission"));
							status.alreadyAsked = true;
							status.answer = allow;
						}
						return allow? originalGetContext: undef;
					case "block":
					default:
						// console.log("block");
						return undef;
				}
			}, unsafeWindow)
		}
	);
	
	var randomImage = (function(){
		var length = Math.floor(20 + Math.random() * 100);
		var bytes = "";
		for (var i = 0; i < length; i += 1){
			bytes += String.fromCharCode(Math.floor(Math.random() * 256));
		}
		return bytes;
	}());
	
	// Readout API blocking
	var fakeFunctions = {
		toDataURL: {
			object: unsafeWindow.HTMLCanvasElement,
			func: function(){
				var type = arguments[0] || "image/png";
				return "data:" + type + ";base64," + btoa(randomImage);
			}
		},
		toBlob: {
			object: unsafeWindow.HTMLCanvasElement,
			func: function(callback){
				var type = arguments[0] || "image/png";
				var blob = new window.Blob(randomImage, {type: type});
				callback(blob);
			},
			exportOptions: {allowCallbacks: true}
		},
		mozGetAsFile: {
			object: unsafeWindow.HTMLCanvasElement,
			func: undef
		},
		getImageData: {
			object: unsafeWindow.CanvasRenderingContext2D,
			func: function(sx, sy, sw, sh){
				var imageData = new window.ImageData(sw, sh);
				var l = sw * sh * 4;
				for (var i = 0; i < l; i += 1){
					imageData.data[i] = Math.floor(
						Math.random() * 256
					);
				}
				return imageData;
			}
		}
	};
	
	Object.keys(fakeFunctions).forEach(function(name){
		var fakeFunction = fakeFunctions[name];
		var original = fakeFunction.object.prototype[name];
		Object.defineProperty(
			fakeFunction.object.prototype,
			name,
			{
				enumerable: true,
				configureable: false,
				get: exportFunction(function(){
					var status = blockMode.readAPI.status;
					if (status === "ask"){
						var askStatus = blockMode.readAPI.askStatus;
						var allow;
						if (askStatus.askOnce && askStatus.alreadyAsked){
							// console.log("already asked");
							allow = askStatus.answer;
						}
						else {
							// console.log("asking");
							allow = window.confirm(_("askForReadoutPermission"));
							askStatus.alreadyAsked = true;
							askStatus.answer = allow;
						}
						status = allow? "allow": "block";
					}
					switch (status){
						case "allow":
							return original;
						case "fake":
							return fakeFunction.func? exportFunction(
								fakeFunction.func,
								unsafeWindow,
								fakeFunction.exportOptions
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
	self.port.on("detach", function(force){
		blockMode.getContext.status = "allow";
		blockMode.readAPI.status = "allow";
	});
}());
