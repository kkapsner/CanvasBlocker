const canvasAPI = {
	draw: function draw(canvas){
		"use strict";
		
		canvas.width = 220;
		canvas.height = 30;
		
		const fingerprintText = "BrowserLeaks,com <canvas> 10";
		
		const context = canvas.getContext("2d");
		context.textBaseline = "top";
		context.font = "14px 'Arial'";
		context.textBaseline = "alphabetic";
		context.fillStyle = "#f60";
		context.fillRect(125, 1, 62, 20);
		context.fillStyle = "#069";
		context.fillText(fingerprintText, 2, 15);
		context.fillStyle = "rgba(102, 204, 0, 07)";
		context.fillText(fingerprintText, 4, 17);
		
		return context;
	},
	getIsPointInPath: function getIsPointInPath(context){
		"use strict";
		
		context.beginPath();
		context.moveTo(20, 19);
		context.lineTo(40, 19);
		context.lineTo(30, 30);
		context.closePath();
		context.stroke();
		
		return context.isPointInPath(30, 19);
	},
	getFingerprintData: function getFingerprintData(canvas, context){
		"use strict";
		
		return {
			imageData: context.getImageData(0, 0, canvas.width, canvas.height),
			url: canvas.toDataURL(),
			isPointInPath: canvasAPI.getIsPointInPath(context)
		};
	},
	getFingerprintFromDifferentDocument: function getFingerprintFromDifferentDocument(otherDocument){
		"use strict";
	
		// create window canvas
		const canvas = document.createElement("canvas");
	
		// draw image in window canvas
		canvasAPI.draw(canvas);
	
		// create other canvas and context
		const otherCanvas = otherDocument.createElement("canvas");
		otherCanvas.setAttribute("width", 220);
		otherCanvas.setAttribute("height", 30);
		const otherContext = otherCanvas.getContext("2d");
	
		// copy image from window canvas to iframe context
		otherContext.drawImage(canvas, 0, 0);
	
		return canvasAPI.getFingerprintData(otherCanvas, otherContext);
	},
	fingerprint: function fingerprint(windowToUse){
		"use strict";
		if (!windowToUse){
			windowToUse = window;
		}
		
		const canvas = document.createElement("canvas");
		const context = canvasAPI.draw(canvas);
		if (windowToUse !== window){
			return canvasAPI.getFingerprintFromDifferentDocument(windowToUse.document);
		}
		else {
			return this.getFingerprintData(canvas, context);
		}
	}
};