const fs = require("fs");
const path = require("path");
const util = require("util");



function getMessagesInContent(content){
	"use strict";
	
	const foundMessages = [];
	[
		/\b(?:_|browser.i18n.getMessage|extension.getTranslation|notify|extension)\(["']([^"']+)["']\s*(?:\)|,)/g,
		/\b(?:messageId|name|getTranslation)\s*:\s*["']([^"']+)["']/g,
	].forEach(function(re){
		let match;
		while ((match = re.exec(content)) !== null){
			foundMessages.push(match[1].toLowerCase());
		}
	});
	return foundMessages;
}

async function getMessagesInFile(path){
	"use strict";
	
	const exists = await util.promisify(fs.exists)(path);
	if (exists){
		const content = await util.promisify(fs.readFile)(path, {encoding: "UTF-8"});
		return getMessagesInContent(content);
	}
	else {
		console.log("file does not exist:", path);
		return [];
	}
}

async function getMessagesInFolder(folder){
	"use strict";
	
	const files = await util.promisify(fs.readdir)(folder, {encoding: "UTF-8"});
	
	const messages = await Promise.all(
		files.filter(function(file){
			return !file.startsWith(".");
		}).map(function(file){
			return path.join(folder, file);
		}).map(async function(path){
			const stat = await util.promisify(fs.stat)(path);
			if (stat.isDirectory()){
				return getMessagesInFolder(path);
			}
			else {
				if (path.endsWith(".js")){
					return getMessagesInFile(path);
				}
				else {
					return [];
				}
			}
		})
	);
	const flat = [];
	messages.forEach(function(messages){
		messages.forEach(function(message){
			flat.push(message);
		});
	});
	return flat;
}


async function getSettingMessages(){
	"use strict";
	
	const settingStrings = require("../lib/settingStrings");
	const settingDefinitions = require("../lib/settingDefinitions");
	function getDefinition(name){
		return settingDefinitions.filter(function(settingDefinition){
			return settingDefinition.name === name;
		})[0];
	}
	const settingsDisplay = require("../options/settingsDisplay");

	const foundMessages = [];
	settingsDisplay.forEach(function(groupDefinition){
		if (groupDefinition.name){
			foundMessages.push("group_" + groupDefinition.name.toLowerCase());
		}
		groupDefinition.sections.forEach(function(sectionDefinition){
			if (sectionDefinition.name){
				foundMessages.push("section_" + sectionDefinition.name.toLowerCase());
			}
			sectionDefinition.settings.forEach(function(display){
				let settingDefinition = getDefinition(display.name);
				if (!settingDefinition){
					settingDefinition = display;
					display.action = true;
				}
				if (settingDefinition){
					if (display.inputs){
						settingDefinition.inputs = display.inputs.map(function(input){
							return getDefinition(input);
						});
					}
					else if (display.actions){
						settingDefinition.actions = display.actions.map(function(action){
							return {name: action};
						});
					}
					settingStrings.getMessages(settingDefinition).forEach(function(message){
						foundMessages.push(message.toLowerCase());
					});
				}
			});
		});
	});
	const presets = require("../options/presets.json");
	Object.keys(presets).forEach(function(preset){
		foundMessages.push("preset_" + preset + "_title");
		foundMessages.push("preset_" + preset + "_description");
	});
	return foundMessages.map(function(message){return message.toLowerCase();});
}

async function getKnownMessages(){
	"use strict";
	
	return [
		"addon_title",
		"addon_description",
		"urlSettings_title",
		"installnotice",
		"presets_installnotice",
		"updatenotice",
		"disableNotifications",
		"showoptions",
		"displayHiddenSettings_title",
		"displayHiddenSettings_description",
		"browseraction_settings",
		"browseraction_test",
		"browseraction_review",
		"browseraction_reportIssue",
	].map(function(message){
		return message.toLowerCase();
	});
}

async function main(){
	"use strict";
	const en = require("../_locales/en/messages.json");
	const declaredMessages = Object.keys(en)
		// .filter(function(key){return en[key].message;})
		.map(function(key){
			return key.toLowerCase();
		});
	const [settingMessages, fileMessages, knownMessages] = await Promise.all([
		getSettingMessages(),
		getMessagesInFolder(path.join(__dirname, "..")),
		getKnownMessages()]
	);

	declaredMessages.forEach(function(message){
		
		if (
			fileMessages.indexOf(message) === -1 &&
			settingMessages.indexOf(message) === -1 &&
			knownMessages.indexOf(message) === -1
		){
			console.log(`usage of ${message} not found`);
		}
	});
}

main();