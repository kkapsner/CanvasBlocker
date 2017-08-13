var table = document.createElement("table");
table.className = "settings";
document.body.appendChild(table);

[
	{
		"name": "displayAdvancedSettings",
		"title": "Display advanced settings",
		"type": "bool",
		"value": false
	},
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
			"blockMode": ["fakeReadout", "fakeInput"],
			"displayAdvancedSettings": [true]
		}
	},
	{
		"name": "maxFakeSize",
		"title": "Maximal fake size",
		"type": "integer",
		"value": 0,
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"],
			"displayAdvancedSettings": [true]
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
				"value": "constant",
				"label": "constant"
			},
			{
				"value": "persistent",
				"label": "persistent"
			}
		],
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"],
			"displayAdvancedSettings": [true]
		}
	},
	{
		"name": "storePersistentRnd",
		"title": "Store persistent data",
		"type": "bool",
		"value": false,
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"],
			"rng": ["persistent"],
			"displayAdvancedSettings": [true]
		}
	},
	{
		"name": "clearPersistentRnd",
		"title": "Clear persistent random storage",
		"type": "control",
		"label": "Clear",
		"displayDependencies": {
			"blockMode": ["fakeReadout", "fakeInput"],
			"rng": ["persistent"],
			"displayAdvancedSettings": [true]
		}
	},
	{
		"name": "ignoreFrequentColors",
		"title": "Ignore most frequent colors",
		"type": "integer",
		"value": 0,
		"displayDependencies": {
			"blockMode": ["fakeReadout"],
			"displayAdvancedSettings": [true]
		}
	},
	{
		"name": "fakeAlphaChannel",
		"title": "Fake the alpha channel",
		"type": "bool",
		"value": false,
		"displayDependencies": {
			"blockMode": ["fakeReadout"],
			"displayAdvancedSettings": [true]
		}
	},
	{
		"name": "useCanvasCache",
		"title": "Use canvas cache",
		"type": "bool",
		"value": true,
		"displayDependencies": {
			"blockMode": ["fakeReadout"],
			"displayAdvancedSettings": [true]
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
			"showNotifications": [true],
			"displayAdvancedSettings": [true]
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
			"blockMode": ["askReadout", "ask"],
			"displayAdvancedSettings": [true]
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
				"showNotifications": [true],
				"displayAdvancedSettings": [true]
			},
			{
				"blockMode": ["askReadout", "ask"],
				"displayAdvancedSettings": [true]
			}
		]
	},{
		"name": "enableStackList",
		"title": "Use file specific scoped white list",
		"type": "bool",
		"value": false,
		"displayDependencies": {
			"blockMode": ["blockReadout", "fakeReadout", "fakeInput", "askReadout", "block", "ask"],
			"displayAdvancedSettings": [true]
		}
	},
	{
		"name": "stackList",
		"title": "File specific white list",
		"type": "string",
		"value": "",
		"displayDependencies": {
			"enableStackList": [true],
			"displayAdvancedSettings": [true]
		}
		
	},
	{
		"name": "showReleaseNotes",
		"title": "Release notes",
		"type": "control",
		"label": "Show"
	},
	{
		"name": "logLevel",
		"title": "logging level",
		"type": "menulist",
		"value": 1,
		"options": [
			{
				"value": 0,
				"label": "none"
			},
			{
				"value": 1,
				"label": "error"
			},
			{
				"value": 25,
				"label": "warning"
			},
			{
				"value": 50,
				"label": "message"
			},
			{
				"value": 75,
				"label": "notice"
			},
			{
				"value": 100,
				"label": "verbose"
			}
		],
		"displayDependencies": {
			"displayAdvancedSettings": [true]
		}
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
			html += '<select' + inputAttributes + 'data-type="' + (typeof pref.value) + '">' +
				pref.options.map(function(option){
					if (option.value !== ""){
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
			logging.warning("Unknown preference type: " + pref.type);
	}
	html += "</div></td>";
	var tr = document.createElement("tr");
	tr.setting = pref;
	tr.className = "settingRow";
	tr.innerHTML = html;
	logging.verbose(html);
	table.appendChild(tr);
});