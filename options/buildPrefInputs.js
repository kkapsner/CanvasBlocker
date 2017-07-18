var table = document.createElement("table");
table.className = "settings";
document.body.appendChild(table);

[
	{
		"name": "blockMode",
		"title": "block mode",
		"type": "menulist",
		"value": "fakeReadout",
		"options": [
			{
				"value": "blockReadout",
				"label": "block readout API"
			},
			{
				"value": "fakeReadout",
				"label": "fake readout API"
			},
			{
				"value": "fakeInput",
				"label": "fake input API"
			},
			{
				"value": "askReadout",
				"label": "ask for readout API permission"
			},
			{
				"value": "",
				"label": ""
			},
			{
				"value": "blockEverything",
				"label": "block everything"
			},
			{
				"value": "block",
				"label": "allow only white list"
			},
			{
				"value": "ask",
				"label": "ask for permission"
			},
			{
				"value": "allow",
				"label": "block only black list"
			},
			{
				"value": "allowEverything",
				"label": "allow everything"
			}
		]
	},
	{
		"name": "whiteList",
		"title": "White list",
		"type": "string",
		"value": "",
		"displayDependencies": {
			"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "block", "ask"]
		}
	},
	{
		"name": "blackList",
		"title": "Black list",
		"type": "string",
		"value": "",
		"displayDependencies": {
			"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "ask", "allow"]
		}
	},
	{
		"name": "minFakeSize",
		"title": "Minimal fake size",
		"type": "integer",
		"value": 1,
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"]
		}
	},
	{
		"name": "maxFakeSize",
		"title": "Maximal fake size",
		"type": "integer",
		"value": 0,
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"]
		}
	},
	{
		"name": "rng",
		"title": "Random number generator",
		"type": "menulist",
		"value": "nonPersistent",
		"options": [
			{
				"value": "nonPersistent",
				"label": "non persistent"
			},
			{
				"value": "persistent",
				"label": "persistent"
			}
		],
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"]
		}
	},
	{
		"name": "storePersistentRnd",
		"title": "Store persistent data",
		"type": "bool",
		"value": false,
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"],
			"rng": ["persistent"]
		}
	},
	{
		"name": "clearPersistentRnd",
		"title": "Clear persistent random storage",
		"type": "control",
		"label": "Clear",
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"],
			"rng": ["persistent"]
		}
	},
	{
		"name": "askOnlyOnce",
		"title": "Ask only once",
		"type": "bool",
		"value": true,
		"displayDependencies": {
			"blockMode": ["askReadout", "ask"]
		}
	},
	{
		"name": "showNotifications",
		"title": "Show notifications",
		"type": "bool",
		"value": true,
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"]
		}
	},
	{
		"name": "storeImageForInspection",
		"title": "Store image for inspection",
		"type": "bool",
		"value": false,
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"],
			"showNotifications": [true]
		}
	},
	// {
		// "name": "notificationDisplayTime",
		// "title": "notification display time",
		// "type": "integer",
		// "value": 30,
		// "displayDependencies": {
			// "blockMode": ["fakeReadout", "fakeInput"]
		// }
	// },
	{
		"name": "ignoreList",
		"title": "Ignore list",
		"type": "string",
		"value": "",
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"],
			"showNotifications": [true]
		}
	},
	{
		"name": "showCallingFile",
		"title": "Display calling file",
		"type": "bool",
		"value": false,
		"displayDependencies": {
			"blockMode": ["askReadout", "ask"]
		}
	},
	{
		"name": "showCompleteCallingStack",
		"title": "Display complete calling stack",
		"type": "bool",
		"value": false,
		"displayDependencies": [
			{
				"blockMode": ["fakeReadout", "fakeInput"],
				"showNotifications": [true]
			},
			{
				"blockMode": ["askReadout", "ask"]
			}
		]
	},{
		"name": "enableStackList",
		"title": "Use file specific scoped white list",
		"type": "bool",
		"value": false,
		"displayDependencies": {
			"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "block", "ask"]
		}
	},
	{
		"name": "stackList",
		"title": "File specific white list",
		"type": "string",
		"value": "",
		"displayDependencies": {
			"enableStackList": [true]
		}
		
	},
	{
		"name": "showReleaseNotes",
		"title": "Release notes",
		"type": "control",
		"label": "Show"
	}
].forEach(function(pref){
	var html = '<td><div class="content"><span class="title">__MSG_' + pref.name + '_title__</span><div class="description">__MSG_' + pref.name + '_description__</div></div></td><td><div class="content">';
	var inputAttributes = ' data-storage-name="' + pref.name + '" data-storage-type="' + pref.type + '" class="setting"'
	switch (pref.type){
		case "integer":
			html += '<input type="number"' + inputAttributes + ' value="' + pref.value + '">';
			break;
		case "string":
			html += '<input type="text"' + inputAttributes + ' value="' + pref.value + '">';
			break;
		case "bool":
			html += '<input type="checkbox" style="display: inline"' + inputAttributes + (pref.value? ' checked="checked"': "") + '>';
			break;
		case "menulist":
			html += '<select' + inputAttributes + '>' +
				pref.options.map(function(option){
					if (option.value){
						return '<option value="' + option.value + '"' + (option.value === pref.value? " selected": "") + '>__MSG_' + pref.name + '_options.' + option.label + '__</option>';
					}
					else {
						return '<option disabled>----------------</option>';
					}
				}).join("") +
				'</select>';
			break;
		case "control":
			html += '<button' + inputAttributes + '">__MSG_' + pref.name + '_label__</button>';
			break;
		default:
			console.log("Unknown preference type: " + pref.type);
	}
	html += "</div></td>";
	var tr = document.createElement("tr");
	tr.setting = pref;
	tr.className = "settingRow";
	tr.innerHTML = html;
	console.log(html);
	table.appendChild(tr);
});