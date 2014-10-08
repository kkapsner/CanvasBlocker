/* global self, window, console, unsafeWindow */
(function(){
	"use strict";
	
	var originalGetContext = unsafeWindow.HTMLCanvasElement.prototype.getContext;
	var originalToDataURL = unsafeWindow.HTMLCanvasElement.prototype.toDataURL;
	var originalGetImageData = unsafeWindow.CanvasRenderingContext2D.prototype.getImageData;
	var askFunctionName = Math.random().toString(16);
	
	function transformFunctionToUnsafeWindow(func, name){
		var funcString = func.toString();
		var parameter = funcString.match(/^function\s*\(([^\)]*)\)\s*\{/)[1];
		funcString = funcString
			.replace(/^function\s*\(([^\)]*)\)\s*\{|\}\s*$/g, "")
			.replace(/(^|\n|\r)\t{3}/g, "$1")
			.replace(/askFunctionName/g, JSON.stringify(askFunctionName))
			.replace(/askForPermission/g, _("askForPermission"))
			.replace(/askForInvisiblePermission/g, _("askForInvisiblePermission"));
		var unsafeFunction = new unsafeWindow.Function(parameter, funcString);
		unsafeFunction.toString =
		unsafeFunction.toLocaleString =
		unsafeFunction.toSource = new unsafeWindow.Function(
			"return \"function " + name + "() {\\n    [native code]\\n}\";"
		);
		return unsafeFunction;
	}
	function setAPIFunctions(getContext, toDataURL, getImageData){
		delete unsafeWindow.HTMLCanvasElement.prototype[askFunctionName];
		if (getContext){
			if (getContext === true){
				getContext = originalGetContext;
			}
			else {
				var secretObject = new unsafeWindow.Object();
				Object.defineProperties(
					secretObject,
					{
					  getContext: {value: originalGetContext},
					  confirm: {value: unsafeWindow.confirm}
					}
				);
				Object.defineProperty(
					unsafeWindow.HTMLCanvasElement.prototype,
					askFunctionName,
					{
						value: secretObject,
						configurable: true,
						enumerable: false
					}
				);
				getContext = transformFunctionToUnsafeWindow(getContext, "getContext");
			}
		}
		unsafeWindow.HTMLCanvasElement.prototype.getContext = getContext;
		
		if (toDataURL){
			if (toDataURL === true){
				toDataURL = originalToDataURL;
			}
			else {
				toDataURL = transformFunctionToUnsafeWindow(toDataURL, "toDataURL");
			}
		}
		unsafeWindow.HTMLCanvasElement.prototype.toDataURL = toDataURL;
		
		if (getImageData){
			if (getImageData === true){
				getImageData = originalGetImageData;
			}
			else {
				getImageData = transformFunctionToUnsafeWindow(getImageData, "getImageData");
			}
		}
		unsafeWindow.CanvasRenderingContext2D.prototype.getImageData = getImageData;
	}

	function checkPDF(blocking){
		if (document.contentType.match(/\/pdf$/i)){
			self.port.emit("isPDF", blocking);
			return true;
		}
		return false;
	}

	function block(force){
		if (force || !checkPDF("block")){
			setAPIFunctions(null, null, null);
		}
	}

	function askVisible(force, askOnlyOnce){
		if (force || !checkPDF("askVisible")){
			setAPIFunctions(
				askOnlyOnce?
				function(){
					if (this.parentNode){
						var oldBorder = this.style.border;
						this.style.border = "2px dashed red";
						var confirmText = "askForPermission";
						// try {throw new Error();}
						// catch (e){
							// console.log(e.stack.split(/\s*(?:-?>|@)\s*/));
						// }
						var allow = this[askFunctionName].confirm.call(window, confirmText);
						this.style.border = oldBorder;
						if (allow){
							HTMLCanvasElement.prototype.getContext = this[askFunctionName].getContext;
							delete HTMLCanvasElement.prototype[askFunctionName];
							return this.getContext.apply(this, arguments);
						}
						else {
							HTMLCanvasElement.prototype.getContext = null;
							delete HTMLCanvasElement.prototype[askFunctionName];
							return null;
						}
					}
					else {
						return null;
					}
				}:
				function(){
					if (this.parentNode){
						var oldBorder = this.style.border;
						this.style.border = "2px dashed red";
						var confirmText = "askForPermission";
						// try {throw new Error();}
						// catch (e){
							// console.log(e.stack.split(/\s*(?:-?>|@)\s*/));
						// }
						var allow = this[askFunctionName].confirm.call(window, confirmText);
						this.style.border = oldBorder;
						if (allow){
							this.getContext = this[askFunctionName].getContext;
							return this.getContext.apply(this, arguments);
						}
						else {
							this.getContext = null;
							return null;
						}
					}
					else {
						return null;
					}
				},
				true,
				true
			);
		}
	}
	function askInvisible(force, askOnlyOnce){
		if (force || !checkPDF("askInvisible")){
			setAPIFunctions(
				askOnlyOnce?
				function(){
					var oldBorder = this.style.border;
					this.style.border = "2px dashed red";
					var confirmText =
						this.parentNode?
						"askForPermission":
						"askForInvisiblePermission";
					var allow = this[askFunctionName].confirm.call(window, confirmText);
					this.style.border = oldBorder;
					if (allow){
						HTMLCanvasElement.prototype.getContext = this[askFunctionName].getContext;
						delete HTMLCanvasElement.prototype[askFunctionName];
						return this.getContext.apply(this, arguments);
					}
					else {
						HTMLCanvasElement.prototype.getContext = null;
						delete HTMLCanvasElement.prototype[askFunctionName];
						return null;
					}
				}:
				function(){
					var oldBorder = this.style.border;
					this.style.border = "2px dashed red";
					var confirmText =
						this.parentNode?
						"askForPermission":
						"askForInvisiblePermission";
					var allow = this[askFunctionName].confirm.call(window, confirmText);
					this.style.border = oldBorder;
					if (allow){
						this.getContext = this[askFunctionName].getContext;
						return this.getContext.apply(this, arguments);
					}
					else {
						this.getContext = null;
						return null;
					}
				},
				true,
				true
			);
		}
	}
	function blockReadout(force){
		if (force || !checkPDF("blockReadout")){
			setAPIFunctions(
				true,
				function(){
					return "data:image/png;base64";
				},
				function(sx, sy, sw, sh){
					var imageData = this.createImageData(sw, sh);
					return imageData;
				}
			);
		}
	}
	function unblock(){
		setAPIFunctions(true, true, true);
	}

	var _ = function(name){
		return _[name] || name;
	};
	self.port.on("setTranslation", function(name, translation){
		_[name] = translation;
	});

	block();
	self.port.on("block", block);
	self.port.on("askVisible", askVisible);
	self.port.on("askInvisible", askInvisible);
	self.port.on("blockReadout", blockReadout);
	self.port.on("unblock", unblock);
	//self.port.on("detach", unblock); // produces memory leak due to the reference to unsafeWindow
}());
