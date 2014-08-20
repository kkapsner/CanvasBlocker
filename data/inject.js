(function(){
	"use strict";
	
	var getContext = unsafeWindow.HTMLCanvasElement.prototype.getContext;
	var askFunctionName = Math.random().toString(16);

	function checkPDF(blocking){
		if (document.contentType.match(/\/pdf$/i)){
			self.port.emit("isPDF", blocking);
			return true;
		}
		return false;
	}

	function block(force){
		if (force || !checkPDF("block")){
			// consoe.log("block");
			delete unsafeWindow.HTMLCanvasElement.prototype[askFunctionName];
			unsafeWindow.HTMLCanvasElement.prototype.getContext = null;
		}
	}

	function askVisible(force){
		if (force || !checkPDF("askVisible")){
			
			Object.defineProperty(
				unsafeWindow.HTMLCanvasElement.prototype,
				askFunctionName,
				{
					value: getContext,
					enumerabe: false
				}
			);
			unsafeWindow.HTMLCanvasElement.prototype.getContext = new unsafeWindow.Function(
				function(){
					if (this.parentNode){
						var oldBorder = this.style.border;
						this.style.border = "2px dashed red";
						var confirmText = "askForPermission";
						var allow = confirm(confirmText);
						this.style.border = oldBorder;
						if (allow){
							this.getContext = this["askFunctionName"];
							return this["askFunctionName"].apply(this, arguments);
						}
						else {
							this.getContext = null;
							return null;
						}
					}
					else {
						return null;
					}
				}.toString()
					.replace(/^function\s*\(\)\s*\{|\}\s*$/g, "")
					.replace(/askFunctionName/g, askFunctionName)
					.replace(/askForPermission/g, _("askForPermission"))
			);
		}
	}
	function askInvisible(force){
		if (force || !checkPDF("askInvisible")){
			
			Object.defineProperty(
				unsafeWindow.HTMLCanvasElement.prototype,
				askFunctionName,
				{
					value: getContext,
					enumerabe: false
				}
			);
			unsafeWindow.HTMLCanvasElement.prototype.getContext = new unsafeWindow.Function(
				function(){
					var oldBorder = this.style.border;
					this.style.border = "2px dashed red";
					var confirmText =
						this.parentNode?
						"askForPermission":
						"askForInvisiblePermission";
					var allow = confirm(confirmText);
					this.style.border = oldBorder;
					if (allow){
						this.getContext = this["askFunctionName"];
						return this["askFunctionName"].apply(this, arguments);
					}
					else {
						this.getContext = null;
						return null;
					}
				}.toString()
					.replace(/^function\s*\(\)\s*\{|\}\s*$/g, "")
					.replace(/askFunctionName/g, askFunctionName)
					.replace(/askForPermission/g, _("askForPermission"))
					.replace(/askForInvisiblePermission/g, _("askForInvisiblePermission"))
			);
		}
	}
	function unblock(){
		// console.log("unblock");
		unsafeWindow.HTMLCanvasElement.prototype.getContext = getContext;
	}

	var _ = function(name){
		return _[name] || name;
	}
	self.port.on("setTranslation", function(name, translation){
		_[name] = translation;
	});

	block();
	self.port.on("block", block);
	self.port.on("askVisible", askVisible);
	self.port.on("askInvisible", askInvisible);
	self.port.on("unblock", unblock);
	self.port.on("detach", unblock);
}());