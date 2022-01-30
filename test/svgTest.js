/* globals testAPI */
(function(){
	"use strict";
	
	function byteArrayToHex(arrayBuffer){
		const chunks = [];
		(new Uint32Array(arrayBuffer)).forEach(function(num){
			chunks.push(num.toString(16));
		});
		return chunks.map(function(chunk){
			return "0".repeat(8 - chunk.length) + chunk;
		}).join("");
	}
	
	function formatNumber(number){
		const str = number.toString();
		return "<span class=small>" + str.substring(0, str.length - 2) + "</span>" +
			str.substring(str.length - 2);
	}
	
	const svg = document.getElementById("svg");
	const output = document.getElementById("test");
	
	function getElements(){
		const doc = svg.contentDocument;
		
		return Array.from(doc.querySelectorAll(".testRect"));
	}
	
	const tests = [];
	function addTest(title, callback){
		tests.push({title, callback});
	}
	
	async function performTests(){
		const elements = getElements();
		const results = await Promise.all(tests.map(async function(test){
			return {
				name: test.title,
				data: await Promise.all(elements.map(async function(svgElement){
					return await test.callback(svgElement);
				}))
			};
		}));
		const data = new Float64Array(elements.length * tests.length);
		results.forEach(function(svgData, i){
			svgData.data.forEach(function(testData, j){
				if ((typeof testData) === "number"){
					data[i * elements.length + j] = testData;
				}
			});
		});
		
		const hash = await crypto.subtle.digest("SHA-256", data);
		output.querySelector(".hash").textContent = byteArrayToHex(hash);
		
		const dataNode = output.querySelector(".data");
		dataNode.innerHTML = "<table><tr><th></th>" +
			elements.map(function(svgElement){
				return "<th>" + svgElement.dataset.name + "</th>";
			}).join("") +
			results.map(function(result){
				return "<tr><th>" + result.name + "</th>" + result.data.map(function(value){
					if ((typeof value) === "number"){
						return "<td class=\"value\">" +
							formatNumber(value) +
							"</td>";
					}
					else {
						return "<td class=\"value unavailable\">--</td>";
					}
				}).join("") + "</tr>";
			}).join("") +
			"</table>";
	}
	
	svg.addEventListener("load", function(){
		addTest("getTotalLength", function(element){
			if (!element.getTotalLength){
				return null;
			}
			return element.getTotalLength();
		});
		addTest("getComputedTextLength", function(element){
			if (!element.getComputedTextLength){
				return null;
			}
			return element.getComputedTextLength();
		});
		[{start: 3, end: 7}, {start: 7, end: 11}, {start: 3, end: 11}].forEach(function(substringDefinition){
			addTest(
				`getSubStringLength(${substringDefinition.start}, ${substringDefinition.end})`,
				function(element){
					if (!element.getSubStringLength){
						return null;
					}
					return element.getSubStringLength(substringDefinition.start, substringDefinition.end);
				}
			);
		});
		
		test.querySelector(".refresh").addEventListener("click", function(){
			performTests();
		});
		performTests();
		
		
		document.querySelectorAll(".content-hidable").forEach(function(parentNode){
			parentNode.querySelector(".toggle").addEventListener("click", function(){
				parentNode.classList.toggle("content-hidden");
			});
		});
	});
}());