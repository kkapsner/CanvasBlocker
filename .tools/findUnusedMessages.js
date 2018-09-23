const fs = require("fs");
const path = require("path");
const util = require("util");



function getMessagesInContent(content){
	const foundMessages = [];
	[
		/\b(?:_|browser.i18n.getMessage|notify)\(["']([^"']+)["']\s*(?:\)|,)/g,
		/\b(?:messageId|name)\s*:\s*["']([^"']+)["']/g,
	].forEach(function(re){
		let match;
		while ((match = re.exec(content)) !== null){
			foundMessages.push(match[1].toLowerCase());
		}
	});
	return foundMessages;
}

async function getMessagesInFile(path){
	return await util.promisify(fs.exists)(path)
	.then(function(exists){
		if (exists){
			return util.promisify(fs.readFile)(path, {encoding: "UTF-8"})
			.then(function(content){
				return getMessagesInContent(content);
			});
		}
		else {
			console.log("file does not exist:", path);
			return [];
		}
	});
}

async function getMessagesInFolder(folder){
	return await util.promisify(fs.readdir)(folder, {encoding: "UTF-8"})
	.then(function(files){
		return Promise.all(
			files.filter(function(file){
				return !file.startsWith(".");
			}).map(function(file){
				return path.join(folder, file);
			}).map(function(path){
				return util.promisify(fs.stat)(path).then(function(stat){
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
				});
			})
		).then(function(messages){
			const flat = [];
			messages.forEach(function(messages){
				messages.forEach(function(message){
					flat.push(message);
				});
			});
			return flat;
		});
	})
}


async function getSettingMessages(){ 
	const settingStrings = require("../lib/settingStrings");
	const settingDefinitions = require("../lib/settingDefinitions");
	function getDefinition(name){
		return settingDefinitions.filter(function(settingDefinition){
			return settingDefinition.name === name;
		})[0];
	}
	const settingsDisplay = require("../options/settingsDisplay");

	const foundMessages = [];
	settingsDisplay.forEach(function(display){
		if ((typeof display) === "string"){
			foundMessages.push("section_" + display.toLowerCase());
		}
		else {
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
		}
	});
	return foundMessages.map(function(message){return message.toLowerCase();});
}

async function getKnownMessages(){
	return [
		"addon_title",
		"addon_description",
		"urlsettings_title",
		"installnotice",
		"updatenotice",
		"disablenotifications",
		"showoptions",
		"displayhiddensettings_title",
		"displayhiddensettings_description",
		"browseraction_settings",
		"browseraction_test",
		"browseraction_review",
		"browseraction_reportissue",
	];
}

const en = require("../_locales/en/messages.json");
const declaredMessages = Object.keys(en)
	// .filter(function(key){return en[key].message;})
	.map(function(key){return key.toLowerCase();});
Promise.all([getSettingMessages(), getMessagesInFolder(path.join(__dirname, "..")), getKnownMessages()]).then(function([settingMessages, fileMessages, knownMessages]){
	declaredMessages.forEach(function(message){
		if (
			fileMessages.indexOf(message) === -1 &&
			settingMessages.indexOf(message) === -1 &&
			knownMessages.indexOf(message) === -1
		){
			console.log(`${message} not used`);
		}
	});
});