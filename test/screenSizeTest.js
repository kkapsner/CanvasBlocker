function addTest(container, title, callback){
	"use strict";
	
	var testContainer = document.createElement("div");
	testContainer.className = "test";
	
	var titleNode = document.createElement("h3");
	titleNode.textContent = title;
	testContainer.appendChild(titleNode);
	
	var resultsNode = document.createElement("div");
	resultsNode.className = "results";
	testContainer.appendChild(resultsNode);
	
	callback(resultsNode);
	
	container.appendChild(testContainer);
}

function addConsistencyTest(title, callback){
	"use strict";
	
	addTest(document.getElementById("consistency"), title, function(resultsNode){
		
		var line = document.createElement("div");
		line.textContent = "consistent: ";
		resultsNode.appendChild(line);
		
		var consistent = document.createElement("span");
		consistent.className = "result";
		line.appendChild(consistent);
		
		function compute(){
			consistent.textContent = "computing";
			callback().then(function(value){
				consistent.textContent = value? "OK": "not OK";
				return;
			}).catch(function(error){
				consistent.classList.add("failed");
				if (Array.isArray(error)){
					consistent.textContent = "";
					var ul = document.createElement("ul");
					consistent.appendChild(ul);
					error.forEach(function(error){
						var li = document.createElement("li");
						li.textContent = error;
						ul.appendChild(li);
					});
				}
				else {
					consistent.textContent = error;
				}
			});
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
	
	var value = Math.floor(Math.min(screen.width, screen.height) / 2);
	
	return Promise.resolve(
		window.matchMedia("(min-device-width: " + value + "px)").matches &&
		window.matchMedia("(min-device-height: " + value + "px)").matches &&
		!window.matchMedia("(max-device-width: " + value + "px)").matches &&
		!window.matchMedia("(max-device-height: " + value + "px)").matches
	);
});

addConsistencyTest("media queries: window.matchMedia - reported value", function(){
	"use strict";
	
	var errors = [];
	["width", "height"].forEach(function(dimension){
		["min-", "max-", ""].forEach(function(comparison){
			var queryBase = "(" + comparison + "device-" + dimension + ": ";
			var query = queryBase + screen[dimension] + "px)";
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
	
	var value = Math.max(screen.width, screen.height) * 2;
	
	return Promise.resolve(
		!window.matchMedia("(min-device-width: " + value + "px)").matches &&
		!window.matchMedia("(min-device-height: " + value + "px)").matches &&
		window.matchMedia("(max-device-width: " + value + "px)").matches &&
		window.matchMedia("(max-device-height: " + value + "px)").matches
	);
});

var addResolutionTest = function(){
	"use strict";
	return function addResolutionTest(title, callback, properties = ["width", "height"]){
		addTest(document.getElementById("resolution"), title, function(resultsNode){
			properties.forEach(function(type){
				var line = document.createElement("div");
				line.textContent = type + ": ";
				resultsNode.appendChild(line);
				
				var number = document.createElement("span");
				number.className = "result " + type;
				line.appendChild(number);
				function compute(){
					number.textContent = "computing";
					callback(type).then(function(value){
						number.textContent = value;
						return;
					}).catch(function(error){
						number.classList.add("failed");
						number.textContent = error;
					});
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

function searchValue(tester){
	"use strict";
	
	var minValue = 0;
	var maxValue = 512;
	var ceiling = Math.pow(2, 32);
	
	function stepUp(){
		if (maxValue > ceiling){
			return Promise.reject("Unable to find upper bound");
		}
		return tester(maxValue).then(function(testResult){
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
		});
	}
	function binarySearch(){
		if (maxValue - minValue < 0.01){
			return tester(minValue).then(function(testResult){
				if (testResult.isEqual){
					return minValue;
				}
				else {
					// eslint-disable-next-line promise/no-nesting
					return tester(maxValue).then(function(testResult){
						if (testResult.isEqual){
							return maxValue;
						}
						else {
							throw "Search could not find exact value." +
								" It's between " + minValue + " and " + maxValue + ".";
						}
					});
				}
			});
		}
		else {
			var pivot = (minValue + maxValue) / 2;
			return tester(pivot).then(function(testResult){
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
			});
		}
	}
	
	return stepUp().then(function(stepUpResult){
		if (stepUpResult){
			return stepUpResult;
		}
		else {
			return binarySearch();
		}
	});
	
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
	
	var tester = document.createElement("div");
	var id = "tester_" + (Math.random() * Math.pow(2, 32)).toString(36).replace(".", "_");
	tester.id = id;
	document.body.appendChild(tester);
	
	var style = document.createElement("style");
	style.type = "text/css";
	document.head.appendChild(style);
	
	var styleSheet = document.styleSheets[document.styleSheets.length - 1];
	styleSheet.insertRule("#" + id + "{position: fixed; right: 100%; z-index: 0;}");
	
	return searchValue(function(valueToTest){
		return new Promise(function(resolve, reject){
			while (styleSheet.rules.length > 1){
				styleSheet.removeRule(1);
			}
			var rule = "@media (max-device-" + type + ": " + valueToTest + "px){#" + id + "{z-index: 1;}}";
			styleSheet.insertRule(rule, 1);
			rule = "@media (device-" + type + ": " + valueToTest + "px){#" + id + "{z-index: 2;}}";
			styleSheet.insertRule(rule, 2);
			window.setTimeout(function(){
				var testValue = window.getComputedStyle(tester).zIndex;
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
	
	var tester = document.createElement("div");
	var id = "tester_" + (Math.random() * Math.pow(2, 32)).toString(36).replace(".", "_");
	tester.id = id;
	document.body.appendChild(tester);
	
	var style = document.createElement("style");
	style.type = "text/css";
	document.head.appendChild(style);
	
	var styleSheet = document.styleSheets[document.styleSheets.length - 1];
	styleSheet.insertRule("#" + id + "{position: fixed; right: 100%; z-index: 0;}");
	
	return searchValue(function(valueToTest){
		return new Promise(function(resolve, reject){
			while (styleSheet.rules.length > 1){
				styleSheet.removeRule(1);
			}
			var rule = "@media (min-device-" + type + ": " + valueToTest + "px){#" + id + "{z-index: 1;}}";
			styleSheet.insertRule(rule, 1);
			rule = "@media (device-" + type + ": " + valueToTest + "px){#" + id + "{z-index: 2;}}";
			styleSheet.insertRule(rule, 2);
			window.setTimeout(function(){
				var testValue = window.getComputedStyle(tester).zIndex;
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
