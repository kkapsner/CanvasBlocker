function addTest(container, title, callback){
	"use strict";
	
	const testContainer = document.createElement("div");
	testContainer.className = "test";
	
	const titleNode = document.createElement("h3");
	titleNode.textContent = title;
	testContainer.appendChild(titleNode);
	
	const resultsNode = document.createElement("div");
	resultsNode.className = "results";
	testContainer.appendChild(resultsNode);
	
	callback(resultsNode);
	
	container.appendChild(testContainer);
}

function addConsistencyTest(title, callback){
	"use strict";
	
	addTest(document.getElementById("consistency"), title, function(resultsNode){
		
		const line = document.createElement("div");
		line.textContent = "consistent: ";
		resultsNode.appendChild(line);
		
		const consistent = document.createElement("span");
		consistent.className = "result";
		line.appendChild(consistent);
		
		async function compute(){
			consistent.textContent = "computing";
			try {
				const value = await callback();
				consistent.textContent = value? "OK": "not OK";
			}
			catch (error){
				consistent.classList.add("failed");
				if (Array.isArray(error)){
					consistent.textContent = "";
					const ul = document.createElement("ul");
					consistent.appendChild(ul);
					error.forEach(function(error){
						const li = document.createElement("li");
						li.textContent = error;
						ul.appendChild(li);
					});
				}
				else {
					consistent.textContent = error;
				}
			}
		}
		compute();
		window.addEventListener("resize", compute);
	});
}

addConsistencyTest("screen properties", function(){
	"use strict";
	
	if (screen.orientation.type.match(/landscape/) && screen.width < screen.height){
		return Promise.reject("orientation wrong");
	}
	if (screen.availHeight > screen.height){
		return Promise.reject("available height too big");
	}
	if (screen.availWidth > screen.width){
		return Promise.reject("available width too big");
	}
	
	return Promise.resolve(true);
});

addConsistencyTest("media queries: window.matchMedia - low value", function(){
	"use strict";
	
	const value = Math.floor(Math.min(screen.width, screen.height) / 2);
	
	return Promise.resolve(
		window.matchMedia("(min-device-width: " + value + "px)").matches &&
		window.matchMedia("(min-device-height: " + value + "px)").matches &&
		!window.matchMedia("(max-device-width: " + value + "px)").matches &&
		!window.matchMedia("(max-device-height: " + value + "px)").matches
	);
});

addConsistencyTest("media queries: window.matchMedia - reported value", function(){
	"use strict";
	
	const errors = [];
	["width", "height"].forEach(function(dimension){
		["min-", "max-", ""].forEach(function(comparison){
			const queryBase = "(" + comparison + "device-" + dimension + ": ";
			let query = queryBase + screen[dimension] + "px)";
			if (!window.matchMedia(query).matches){
				errors.push(query + " did not match.");
				query = queryBase + (screen[dimension] + 1) + "px)";
				if (!window.matchMedia(query).matches){
					errors.push(query + " did not match.");
				}
				query = queryBase + (screen[dimension] - 1) + "px)";
				if (!window.matchMedia(query).matches){
					errors.push(query + " did not match.");
				}
			}
		});
	});
	if (errors.length){
		return Promise.reject(errors);
	}
	return Promise.resolve(true);
});

addConsistencyTest("media queries: window.matchMedia - big value", function(){
	"use strict";
	
	const value = Math.max(screen.width, screen.height) * 2;
	
	return Promise.resolve(
		!window.matchMedia("(min-device-width: " + value + "px)").matches &&
		!window.matchMedia("(min-device-height: " + value + "px)").matches &&
		window.matchMedia("(max-device-width: " + value + "px)").matches &&
		window.matchMedia("(max-device-height: " + value + "px)").matches
	);
});

const addResolutionTest = function(){
	"use strict";
	return function addResolutionTest(title, callback, properties = ["width", "height"]){
		addTest(document.getElementById("resolution"), title, function(resultsNode){
			properties.forEach(function(type){
				const line = document.createElement("div");
				line.textContent = type + ": ";
				resultsNode.appendChild(line);
				
				const number = document.createElement("span");
				number.className = "result " + type;
				line.appendChild(number);
				async function compute(){
					number.textContent = "computing";
					try {
						const value = await callback(type);
						number.textContent = value;
					}
					catch (error){
						number.classList.add("failed");
						number.textContent = error;
					}
				}
				compute();
				window.addEventListener("resize", compute);
			});
		});
	};
}();

addResolutionTest("screen properties", function(type){
	"use strict";
	
	return Promise.resolve(screen[type]);
});

addResolutionTest("screen properties: avail...", function(type){
	"use strict";
	
	return Promise.resolve(screen[
		"avail" + type.substring(0, 1).toUpperCase() + type.substring(1)
	]);
}, ["width", "height", "left", "top"]);

addResolutionTest("window properties: inner...", function(type){
	"use strict";
	
	return Promise.resolve(window[
		"inner" + type.substring(0, 1).toUpperCase() + type.substring(1)
	]);
});

addResolutionTest("window properties: outer...", function(type){
	"use strict";
	
	return Promise.resolve(window[
		"outer" + type.substring(0, 1).toUpperCase() + type.substring(1)
	]);
});

async function searchValue(tester){
	"use strict";
	
	let minValue = 0;
	let maxValue = 512;
	const ceiling = Math.pow(2, 32);
	
	async function stepUp(){
		if (maxValue > ceiling){
			return Promise.reject("Unable to find upper bound");
		}
		const testResult = await tester(maxValue);
		if (testResult === searchValue.isEqual){
			return maxValue;
		}
		else if (testResult === searchValue.isBigger){
			minValue = maxValue;
			maxValue *= 2;
			return stepUp();
		}
		else {
			return false;
		}
	}
	let v = 1;
	async function test(){
		const r = await tester(v);
		v = 2;
	}
	async function binarySearch(){
		if (maxValue - minValue < 0.01){
			const testResult = await tester(minValue);
			if (testResult.isEqual){
				return minValue;
			}
			else {
				const testResult = await tester(maxValue);
				if (testResult.isEqual){
					return maxValue;
				}
				else {
					throw "Search could not find exact value." +
						" It's between " + minValue + " and " + maxValue + ".";
				}
			}
		}
		else {
			const pivot = (minValue + maxValue) / 2;
			const testResult = await tester(pivot);
			if (testResult === searchValue.isEqual){
				return pivot;
			}
			else if (testResult === searchValue.isBigger){
				minValue = pivot;
				return binarySearch();
			}
			else {
				maxValue = pivot;
				return binarySearch();
			}
		}
	}
	
	const stepUpResult = await stepUp();
	if (stepUpResult){
		return stepUpResult;
	}
	else {
		return binarySearch();
	}
}
searchValue.isSmaller = -1;
searchValue.isEqual = 0;
searchValue.isBigger = 1;

addResolutionTest("media queries: window.matchMedia (max)", function(type){
	"use strict";
	
	return searchValue(function(valueToTest){
		if (window.matchMedia("(device-" + type + ": " + valueToTest + "px)").matches){
			return Promise.resolve(searchValue.isEqual);
		}
		else if (window.matchMedia("(max-device-" + type + ": " + valueToTest + "px)").matches){
			return Promise.resolve(searchValue.isSmaller);
		}
		else {
			return Promise.resolve(searchValue.isBigger);
		}
	});
});

addResolutionTest("media queries: window.matchMedia (min)", function(type){
	"use strict";
	
	return searchValue(function(valueToTest){
		if (window.matchMedia("(device-" + type + ": " + valueToTest + "px)").matches){
			return Promise.resolve(searchValue.isEqual);
		}
		else if (window.matchMedia("(min-device-" + type + ": " + valueToTest + "px)").matches){
			return Promise.resolve(searchValue.isBigger);
		}
		else {
			return Promise.resolve(searchValue.isSmaller);
		}
	});
});

addResolutionTest("media queries: css (max)", function(type){
	"use strict";
	
	const tester = document.createElement("div");
	const id = "tester_" + (Math.random() * Math.pow(2, 32)).toString(36).replace(".", "_");
	tester.id = id;
	document.body.appendChild(tester);
	
	const style = document.createElement("style");
	style.type = "text/css";
	document.head.appendChild(style);
	
	const styleSheet = document.styleSheets[document.styleSheets.length - 1];
	styleSheet.insertRule("#" + id + "{position: fixed; right: 100%; z-index: 0;}");
	
	return searchValue(function(valueToTest){
		return new Promise(function(resolve, reject){
			while (styleSheet.rules.length > 1){
				styleSheet.removeRule(1);
			}
			let rule = "@media (max-device-" + type + ": " + valueToTest + "px){#" + id + "{z-index: 1;}}";
			styleSheet.insertRule(rule, 1);
			rule = "@media (device-" + type + ": " + valueToTest + "px){#" + id + "{z-index: 2;}}";
			styleSheet.insertRule(rule, 2);
			window.setTimeout(function(){
				const testValue = window.getComputedStyle(tester).zIndex;
				switch (testValue){
					case "0":
						resolve(searchValue.isBigger);
						break;
					case "1":
						resolve(searchValue.isSmaller);
						break;
					case "2":
						resolve(searchValue.isEqual);
						break;
					default:
						reject("Unknown test value: " + testValue);
				}
			}, 1);
		});
	});
});

addResolutionTest("media queries: css (min)", function(type){
	"use strict";
	
	const tester = document.createElement("div");
	const id = "tester_" + (Math.random() * Math.pow(2, 32)).toString(36).replace(".", "_");
	tester.id = id;
	document.body.appendChild(tester);
	
	const style = document.createElement("style");
	style.type = "text/css";
	document.head.appendChild(style);
	
	const styleSheet = document.styleSheets[document.styleSheets.length - 1];
	styleSheet.insertRule("#" + id + "{position: fixed; right: 100%; z-index: 0;}");
	
	return searchValue(function(valueToTest){
		return new Promise(function(resolve, reject){
			while (styleSheet.rules.length > 1){
				styleSheet.removeRule(1);
			}
			let rule = "@media (min-device-" + type + ": " + valueToTest + "px){#" + id + "{z-index: 1;}}";
			styleSheet.insertRule(rule, 1);
			rule = "@media (device-" + type + ": " + valueToTest + "px){#" + id + "{z-index: 2;}}";
			styleSheet.insertRule(rule, 2);
			window.setTimeout(function(){
				const testValue = window.getComputedStyle(tester).zIndex;
				switch (testValue){
					case "0":
						resolve(searchValue.isSmaller);
						break;
					case "1":
						resolve(searchValue.isBigger);
						break;
					case "2":
						resolve(searchValue.isEqual);
						break;
					default:
						reject("Unknown test value: " + testValue);
				}
			}, 1);
		});
	});
});
