var getContext = unsafeWindow.HTMLCanvasElement.prototype.getContext

function block(){
	unsafeWindow.HTMLCanvasElement.prototype.getContext = null;
}
function unblock(){
	unsafeWindow.HTMLCanvasElement.prototype.getContext = getContext;
}

self.port.on("block", block);
self.port.on("unblock", unblock);
self.port.on("detach", unblock);