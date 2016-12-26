var getPageActionIcon = function(){
	var faktor = 2;
	var canvas = document.createElement("canvas");
	canvas.width = canvas.height = 19 * faktor;
	var context = canvas.getContext("2d");
	var img = document.createElement("img");
	img.src = "icons/printed" + (19 * faktor) + ".png"
	
	
	return function getPageActionIcon(c){
		context.clearRect(0, 0, canvas.width, canvas.height);
		context.drawImage(img, 0, 0, canvas.width, canvas.height);
		if (c > 1){
			context.fillStyle = "#000000";
			context.fillRect(9 * faktor, 9 * faktor, 10 * faktor, 10 * faktor);
			context.strokeStyle = context.fillStyle = "#FFFFFF";
			context.textAlign = "center";
			context.textBaseline = "middle";
			context.font = "Bold " + (10 * faktor) + "px Arial";
			context.fillText(c < 10? c: ">", 14 * faktor, 15 * faktor);
		}
		return context.getImageData(0, 0, canvas.width, canvas.height);
	}
}();

function updatePageActionIcon(tabId, c){
	if (c === 0){
		browser.pageAction.hide(tabId);
	}
	else {
		browser.pageAction.show(tabId);
		browser.pageAction.setIcon({
			tabId: tabId,
			imageData: getPageActionIcon(c)
		});
	}
}

var c = 0;

browser.tabs.query({}).then(function(tabs){
	tabs.forEach(function(tab){
		browser.pageAction.show(tab.id);
	});
});

browser.tabs.onActivated.addListener(function(activeInfo){
	c += 1;
	// console.log(c);
	updatePageActionIcon(activeInfo.tabId , c);
});
browser.tabs.onUpdated.addListener(function(tabId){
	// c += 1;
	//console.log(c);
	// updatePageActionIcon(tabId, c);
});
	