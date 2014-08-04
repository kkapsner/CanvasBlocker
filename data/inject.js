var getContext = unsafeWindow.HTMLCanvasElement.prototype.getContext;
var askFunctionName = Math.random().toString(16);

function checkPDF(blocking){
	if (unsafeWindow.document.contentType.match(/\/pdf$/i)){
		self.port.emit("isPDF", blocking);
		return false;
	}
	return true;
}

function block(force){
	if (force || !checkPDF("block")){
		// consoe.log("block");
		delete unsafeWindow.HTMLCanvasElement.prototype[askFunctionName];
		unsafeWindow.HTMLCanvasElement.prototype.getContext = null;
	}
}
function ask(force){
	if (force || !checkPDF("ask")){
		// console.log("ask");
		
		Object.defineProperty(
			unsafeWindow.HTMLCanvasElement.prototype,
			askFunctionName,
			{
				value: getContext,
				enumerabe: false
			}
		);
		unsafeWindow.HTMLCanvasElement.prototype.getContext = new unsafeWindow.Function(function(){
			var oldBorder = this.style.border;
			this.style.border = "2px dashed red";
			var confirmText =
				this.parentNode?
				"Do you want to allow the red bordered <canvas>?":
				"Do you want to allow an invisibe <canvas>?";
			var allow = confirm(confirmText);
			this.style.border = oldBorder;
			if (allow){
				this.getContext = this["askFunctionName"];
				return this["askFunctionName"].apply(this, arguments);
			}
			else {
				return null;
			}
		}.toString().replace(/^function\s*\(\)\s*\{|\}\s*$/g, "").replace(/askFunctionName/g, askFunctionName));
	}
}
function unblock(){
	// console.log("unblock");
	unsafeWindow.HTMLCanvasElement.prototype.getContext = getContext;
}

ask();
self.port.on("block", block);
self.port.on("ask", ask);
self.port.on("unblock", unblock);
self.port.on("detach", unblock);