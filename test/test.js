/* globals testAPI, canvasAPI */
(function(){
	"use strict";
	
	async function show(container, {url, imageData, isPointInPath}){
		const display = container.querySelector(".display");
		display.src = url;
		display.title = url;
		const hashes = await Promise.all([
			testAPI.hash(url),
			testAPI.hash(imageData.data)
		]);
		container.querySelector(".hash").textContent =
			hashes[0] + " / " +
			hashes[1];
		container.querySelector(".isPointInPath").textContent = isPointInPath;
	}
	
	function iframeTest(testNode){
		const iframe = testNode.querySelector("iframe");
		return canvasAPI.fingerprint(iframe.contentWindow);
	}
	
	const tests = {
		top: function(){return canvasAPI.fingerprint();},
		iframe: iframeTest,
		iframe2: iframeTest,
		iframe3: iframeTest,
		iframe4: dynamicIframeTest1,
		iframe5: dynamicIframeTest2,
		iframe6: dynamicIframeTest3,
		windowOpen: async function(testNode, initial){
			if (initial){
				return new Promise(function(resolve){
					window.addEventListener("click", function windowOpenTest(){
						window.removeEventListener("click", windowOpenTest);
						const newWindow = window.open("/");
						try{
							resolve(canvasAPI.fingerprint(newWindow));
						}
						catch (error){
							console.error(error);
						}
						newWindow.close();
					});
				});
			}
			else {
				const newWindow = window.open("/");
				const fingerprint = canvasAPI.fingerprint(newWindow);
				newWindow.close();
				return fingerprint;
			}
		}
	};
	
	Object.keys(tests).forEach(async function(testName){
		const testNode = document.getElementById(testName);
		const callback = tests[testName];
		if (location.search !== "?notInitial"){
			try {show(testNode, await callback(testNode, true));}
			catch (error){console.error(testName, error);}
		}
		testNode.querySelector("button").addEventListener("click", async function(){
			show(testNode, await callback(testNode));
		});
	});
}());

function dynamicIframeTest1(){
	"use strict";
	
	const length = frames.length;
	const iframe = document.createElement("iframe");
	document.body.appendChild(iframe);
	const iframeWindow = frames[length];
	document.body.removeChild(iframe);
	return canvasAPI.fingerprint(iframeWindow);
}

function dynamicIframeTest2(){
	"use strict";
	
	const length = window.length;
	const iframe = document.createElement("iframe");
	document.body.appendChild(iframe);
	const iframeWindow = window[length];
	document.body.removeChild(iframe);
	return canvasAPI.fingerprint(iframeWindow);
}

function dynamicIframeTest3(){
	"use strict";
	
	const length = window.length;
	const div = document.createElement("div");
	document.body.appendChild(div);
	div.innerHTML = "<iframe></iframe>";
	const iframeWindow = window[length];
	document.body.removeChild(div);
	return canvasAPI.fingerprint(iframeWindow);
}