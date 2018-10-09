/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	var scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = {};
		window.scope.sanitationRules = scope;
	}
	
	const settings = require("./settings");
	
	scope.ruleset = [
		{
			name: "unnecessaryURLValue",
			check: function(errorCallback){
				const {url: urlContainer} = settings.getContainers();
				const containerValue = urlContainer.get();
				const errorMessage = browser.i18n.getMessage("sanitation_error.unnecessaryURLValue");
				function createErrorMessage(setting, urlValue){
					return errorMessage
						.replace(/{setting-technical}/g, setting.name)
						.replace(/{setting-title}/g, browser.i18n.getMessage(setting.name + "_title"))
						.replace(/{url}/g, urlValue.url);
				}
				containerValue.forEach(function(urlValues){
					Object.keys(urlValues).filter(function(key){
						return key !== "url";
					}).forEach(function(key){
						const setting = settings.getDefinition(key);
						if (setting && setting.urlSpecific){
							const globalValue = setting.get();
							if (urlValues[key] === globalValue){
								errorCallback({
									message: createErrorMessage(setting, urlValues),
									severity: "low",
									resolutions: [{
										label: browser.i18n.getMessage("sanitation_resolution.removeURLValue"),
										callback: function(){
											setting.reset(urlValues.url);
										}
									}]
								});
							}
						}
					});
				});
			}
		},
		{
			name: "disabledFeatures",
			check: function(errorCallback){
				const errorMessage = browser.i18n.getMessage("sanitation_error.disabledFeatures");
				function createErrorMessage(api){
					return errorMessage.replace(/{api}/g, browser.i18n.getMessage("section_" + api.section));
				}
				const protectedFeatures = settings.getDefinition("protectedAPIFeatures");
				const protectedFeaturesValue = protectedFeatures.get();
				function getSectionKeys(section){
					let inSection = false;
					return protectedFeatures.keys.filter(function(key){
						if (typeof key === "string"){
							return inSection;
						}
						else {
							if (key.level === 1){
								inSection = key.name === section;
							}
							return false;
						}
					});
				}
				[
					{mainFlag: "protectAudio", section: "Audio-API"},
					{mainFlag: "protectWindow", section: "Window-API"},
					{mainFlag: "protectDOMRect", section: "DOMRect-API"},
				].forEach(function(api){
					if (settings.get(api.mainFlag)){
						let inSection = false;
						let anyActive = false;
						if (getSectionKeys(api.section).every(function(key){
							return protectedFeaturesValue.hasOwnProperty(key) &&
								!protectedFeaturesValue[key];
						})){
							errorCallback({
								message: createErrorMessage(api),
								severity: "high",
								resolutions: [
									{
										label: browser.i18n.getMessage("sanitation_resolution.enableFeatures"),
										callback: function(){
											const protectedFeaturesValue = protectedFeatures.get();
											getSectionKeys(api.section).forEach(function(key){
												protectedFeaturesValue[key] = true;
											});
											protectedFeatures.set(protectedFeaturesValue);
										}
									},
									{
										label: browser.i18n.getMessage("sanitation_resolution.disableMainFlag"),
										callback: function(){
											settings.set(api.mainFlag, false);
										}
									},
								]
							});
						}
					}
				});
			}
		},
		{
			name: "blockMode",
			check: function(errorCallback){
				const switchMode = {
					label: browser.i18n.getMessage("sanitation_resolution.switchToFakeReadout"),
					callback: function(){
						settings.blockMode = "fakeReadout";
					}
				};
				const blockMode = settings.blockMode;
				const blockModeName = browser.i18n.getMessage("blockMode_options." + blockMode);
				if (!blockMode.match("^fake|^ask")){
					errorCallback({
						message: browser.i18n.getMessage("sanitation_error.badBlockMode"),
						severity: "medium",
						resolutions: [switchMode]
					});
				}
				["Audio", "Window", "DOMRect"].forEach(function(api){
					const mainFlag = "protect" + api;
					if (settings[mainFlag]){
						if (["fakeInput"].indexOf(blockMode) !== -1){
							const blockModeName = browser.i18n.getMessage("blockMode_options." + blockMode);
							errorCallback({
								message: browser.i18n.getMessage("sanitation_error.blockModeVsProtection")
									.replace(/{blockMode}/g, blockModeName)
									.replace(/{api}/g, browser.i18n.getMessage("section_" + api + "-api")),
								severity: "high",
								resolutions: [switchMode, {
									label: browser.i18n.getMessage("sanitation_resolution.disableFlag")
										.replace(/{flag}/g, browser.i18n.getMessage(mainFlag + "_title")),
									callback: function(){
										settings[mainFlag] = false;
									}
								}]
							});
						}
					}
				});
				if (blockMode === "fakeInput" && settings.rng === "white"){
					errorCallback({
						message: browser.i18n.getMessage("sanitation_error.fakeInputWithWhiteRng")
							.replace(/{blockMode}/g, blockModeName),
						severity: "low",
						resolutions: [switchMode, {
							label: browser.i18n.getMessage("sanitation_resolution.switchToNonPersistendRng"),
							callback: function(){
								settings.rng = "nonPersistent";
							}
						}]
					});
				}
			}
		},
		{
			name: "thresholds",
			check: function(errorCallback){
				const setToLabel = browser.i18n.getMessage("sanitation_resolution.setTo");
				const tooLowLabel = browser.i18n.getMessage("sanitation_error.valueTooLow");
				const tooHighLabel = browser.i18n.getMessage("sanitation_error.valueTooHigh");
				if (settings.minFakeSize > 1e2){
					errorCallback({
						message: tooHighLabel
							.replace(/{setting}/g, browser.i18n.getMessage("minFakeSize_title"))
							.replace(/{value}/g, "100"),
						severity: "high",
						resolutions: [{
							label: setToLabel.replace(/{value}/g, "100"),
							callback: function(){
								settings.minFakeSize = 1e2;
							}
						}]
					});
				}
				if (settings.maxFakeSize !== 0 && settings.maxFakeSize < 1e6){
					errorCallback({
						message: tooLowLabel
							.replace(/{setting}/g, browser.i18n.getMessage("maxFakeSize_title"))
							.replace(/{value}/g, "1 000 000"),
						severity: "high",
						resolutions: [{
							label: setToLabel.replace(/{value}/g, "1 000 000"),
							callback: function(){
								settings.maxFakeSize = 1e6;
							}
						}]
					});
				}
				if (settings.ignoreFrequentColors > 3){
					errorCallback({
						message: tooHighLabel
							.replace(/{setting}/g, browser.i18n.getMessage("ignoreFrequentColors_title"))
							.replace(/{value}/g, "3"),
						severity: "high",
						resolutions: [{
							label: setToLabel.replace(/{value}/g, "3"),
							callback: function(){
								settings.ignoreFrequentColors = 3;
							}
						}]
					});
				}
				if (settings.minColors > 10){
					errorCallback({
						message: tooHighLabel
							.replace(/{setting}/g, browser.i18n.getMessage("minColors_title"))
							.replace(/{value}/g, "10"),
						severity: "high",
						resolutions: [{
							label: setToLabel.replace(/{value}/g, "10"),
							callback: function(){
								settings.minColors = 10;
							}
						}]
					});
				}
			}
		},
		{
			name: "performance",
			check: function(errorCallback){
				const disableLabel = browser.i18n.getMessage("sanitation_resolution.disableFlag");
				if (settings.storeNotificationData){
					errorCallback({
						message: browser.i18n.getMessage("sanitation_error.storeNotificationData"),
						severity: "low",
						resolutions: [{
							label: disableLabel
								.replace(/{flag}/g, browser.i18n.getMessage("storeNotificationData_title")),
							callback: function(){
								settings.storeNotificationData = false;
							}
						}]
					});
					if (settings.storeImageForInspection){
						errorCallback({
							message: browser.i18n.getMessage("sanitation_error.storeImage"),
							severity: "low",
							resolutions: [{
								label: disableLabel
									.replace(/{flag}/g, browser.i18n.getMessage("storeImageForInspection_title")),
								callback: function(){
									settings.storeImageForInspection = false;
								}
							}]
						});
					}
				}
			}
		},
	];
}());