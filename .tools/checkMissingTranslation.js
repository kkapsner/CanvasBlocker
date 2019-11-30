const en = require("../_locales/en/messages.json");
const enKeys = Object.keys(en);

const language = process.argv[2];

const la = require("../_locales/" + language + "/messages.json");
const laKeys = Object.keys(la);

enKeys.forEach(function(key){
	"use strict";
	
	if (en[key].message){
		if (!la[key] || !la[key].message){
			console.log(key, "missing");
		}
	}
});