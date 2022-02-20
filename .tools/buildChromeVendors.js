const data = require("./chromeVendors.json");

function addString(string, currentTree){
	"use strict";
	if (string.length <= 1){
		const nextTree = currentTree[string] || {};
		currentTree[string] = nextTree;
	}
	else {
		const firstChar = string.substring(0, 1);
		const nextTree = currentTree[firstChar] || {};
		currentTree[firstChar] = nextTree;
		const nextString = string.substring(1);
		addString(nextString, nextTree);
	}
}

function output(tree){
	"use strict";
	const keys = Object.keys(tree);
	switch (keys.length){
		case 0:
			return "";
		case 1:
			return keys[0] + output(tree[keys[0]]);
		default:
			return "<" + keys.map(key => key + output(tree[key])).join("|") + ">";
	}
}

// every string ends with a ) and does not contain <, >, $ or |
data.forEach(function(string){
	"use strict";
	if (
		!string.endsWith(")") ||
		string.match(/[<>|$]/)
	){
		throw string;
	}
});



const tree1 = {};
const tree2 = {};
const tree3 = {};
data.every(function(string){
	"use strict";
	string = string.substring(0, string.length - 1);
	const parts = string.split(" Direct", 2);
	const parts2 = parts[0].split(" (Microsoft Corporation", 2);
	addString(parts2[0], tree1);
	if (parts2.length > 1){
		addString(" (Microsoft Corporation" + parts2[1], tree2);
	}
	else {
		addString("", tree2);
	}
	
	if (parts.length > 1){
		addString(" Direct" + parts[1], tree3);
	}
	else {
		addString("", tree3);
	}
	return true;
});
// const compressed = output(tree1) + output(tree2) + output(tree3) + ")";
const compressed = output(tree1) + output(tree2) +
	"< Direct3D<11 vs_<4_<0 ps_4_0|1 ps_4_1>|5_0 ps_5_0>|9<Ex|> vs_<0_0 ps_<2_0|3_0>|2_0 ps_2_0|3_0 ps_3_0>>|>" + ")";
console.log("compressed length", compressed.length);
// console.log(compressed);

function countWords(string){
	"use strict";
	const words = {};
	string.split(/[^0-9a-z]+/i).filter(word => word.length > 2).forEach(function(word){
		const wordStats = words[word] || {count: 0};
		words[word] = wordStats;
		wordStats.count += 1;
	});
	return words;
}

function wordCompressor(string){
	"use strict";
	const words = countWords(string);
	const duplicatedWord = Object.keys(words)
		.map(function(word){
			return {
				word,
				count: words[word].count
			};
		})
		.filter(word => word.count > 1)
		.sort((a, b) => b.word.length*b.count - a.word.length*a.count);
	let compressed = string;
	let index = 0;
	const usedWords = [];
	for (let i = 0; i < duplicatedWord.length; i += 1){
		const replacement = "$" + index.toString(36);
		const word = duplicatedWord[i].word;
		if (
			replacement.length < word.length &&
			(word.length - replacement.length) * duplicatedWord[i].count > word.length + 1
		){
			compressed = compressed.replace(new RegExp("\\b" + word + "\\b", "g"), replacement);
			index += 1;
			usedWords.push(word);
		}
	}
	return {compressed, usedWords};
}
const {compressed: compressed2, usedWords} = wordCompressor(compressed);
console.log("compressed 2 length", compressed2.length);
console.log(compressed2);
console.log(usedWords.join("|"));

function decompress(string, words){
	"use strict";
	return string.replace(/\$([0-9a-z]+)/gi, function(m, index){
		return words[parseInt(index, 36)];
	});
}
const decompressed2 = decompress(compressed2, usedWords);
console.log("test: ", compressed === decompressed2);
for (let start = 0; start < compressed.length; start += 100){
	
	if (compressed.substring(start, start + 100) !== decompressed2.substring(start, start + 100)){
		console.log(start);
		console.log(compressed.substring(start, start + 100));
		console.log(decompressed2.substring(start, start + 100));
	}
}

function pickOne(string){
	"use strict";
	const options = [];
	let cumulate = "";
	let index = 0;
	for (const l = string.length; index < l; index += 1){
		const char = string.charAt(index);
		if (char === "|"){
			options.push(cumulate);
			cumulate = "";
		}
		else if (char === "<"){
			const subPick = pickOne(string.substring(index + 1));
			cumulate += subPick.value;
			index += 1 + subPick.endIndex;
		}
		else if (char === ">"){
			break;
		}
		else {
			cumulate += char;
		}
	}
	options.push(cumulate);
	return {value: options[Math.floor(Math.random() * options.length)], endIndex: index};
}

console.log(pickOne(compressed).value);

