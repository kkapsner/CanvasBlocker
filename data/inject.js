/* global self, window, console, unsafeWindow */
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
			status: "allow"
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
	
	var originalToDataURL = unsafeWindow.HTMLCanvasElement.prototype.toDataURL;
	Object.defineProperty(
		unsafeWindow.HTMLCanvasElement.prototype,
		"toDataURL",
		{
			enumerable: true,
			configureable: false,
			get: exportFunction(function(){
				switch (blockMode.readAPI.status){
					case "allow":
						return originalToDataURL;
					case "block":
					default:
						return exportFunction(
							function(){
								var type = arguments[0] || "image/png";
								return "data:" + type + ";base64," + btoa(randomImage);
							},
							unsafeWindow
						);
				}
			}, unsafeWindow)
		}
	);
	
	var originalToBlob = unsafeWindow.HTMLCanvasElement.prototype.toBlob;
	Object.defineProperty(
		unsafeWindow.HTMLCanvasElement.prototype,
		"toBlob",
		{
			enumerable: true,
			configureable: false,
			get: exportFunction(function(){
				switch (blockMode.readAPI.status){
					case "allow":
						return originalToBlob;
					case "block":
					default:
						return exportFunction(
							function(callback){
								var type = arguments[0] || "image/png";
								var blob = new window.Blob(randomImage, {type: type});
								callback(blob);
							},
							unsafeWindow,
							{allowCallbacks: true}
						);
				}
			}, unsafeWindow)
		}
	);
	
	var originalMozGetAsFile = unsafeWindow.HTMLCanvasElement.prototype.mozGetAsFile;
	Object.defineProperty(
		unsafeWindow.HTMLCanvasElement.prototype,
		"mozGetAsFile",
		{
			enumerable: true,
			configureable: false,
			get: exportFunction(function(){
				switch (blockMode.readAPI.status){
					case "allow":
						return originalMozGetAsFile;
					case "block":
					default:
						undef
				}
			}, unsafeWindow)
		}
	);
	
	var originalGetImageData = unsafeWindow.CanvasRenderingContext2D.prototype.getImageData;
	Object.defineProperty(
		unsafeWindow.CanvasRenderingContext2D.prototype,
		"getImageData",
		{
			enumerable: true,
			configureable: false,
			get: exportFunction(function(){
				switch (blockMode.readAPI.status){
					case "allow":
						return originalGetImageData;
					case "block":
					default:
						return exportFunction(
							function(sx, sy, sw, sh){
								var imageData = new window.ImageData(sw, sh);
								var l = sw * sh * 4;
								for (var i = 0; i < l; i += 1){
									imageData.data[i] = Math.floor(
										Math.random() * 256
									);
								}
								return imageData;
							},
							unsafeWindow
						);
				}
			}, unsafeWindow)
		}
	);

	var _ = function(name){
		return _[name] || name;
	};
	self.port.on("setTranslation", function(name, translation){
		_[name] = translation;
	});
	
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
	self.port.on("unblock", function(){
		blockMode.getContext.status = "allow";
		blockMode.readAPI.status = "allow";
	});
	self.port.on("detach", function(force){
		blockMode.getContext.status = "allow";
		blockMode.readAPI.status = "allow";
	});
}());
