/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
(function(){
	"use strict";

	let scope;
	if ((typeof exports) !== "undefined"){
		scope = exports;
	}
	else {
		scope = require.register("./sanitationRules", {});
	}
	
	const extension = require("../lib/extension");
	const settings = require("../lib/settings");
	
	scope.ruleset = [
		{
			name: "unnecessaryURLValue",
			check: function(errorCallback){
				const {url: urlContainer} = settings.getContainers();
				const containerValue = urlContainer.get();
				const errorMessage = extension.getTranslation("sanitation_error.unnecessaryURLValue");
				function createErrorMessage(setting, urlValue){
					return errorMessage
						.replace(/{setting-technical}/g, setting.name)
						.replace(/{setting-title}/g, extension.getTranslation(setting.name + "_title"))
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
										label: extension.getTranslation("sanitation_resolution.removeURLValue"),
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
				const allErrorMessage = extension.getTranslation("sanitation_error.disabledFeatures");
				const someErrorMessage = extension.getTranslation("sanitation_error.disabledSomeFeatures");
				function createErrorMessage(api, all = false){
					return (all? allErrorMessage: someErrorMessage).replace(
						/{api}/g,
						extension.getTranslation("section_" + api.section));
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
					{mainFlag: "protectedCanvasPart", mainFlagDisabledValue: "nothing", section: "Canvas-API"},
					{mainFlag: "protectAudio", section: "Audio-API"},
					{mainFlag: "protectWindow", section: "Window-API"},
					{mainFlag: "protectDOMRect", section: "DOMRect-API"},
					{mainFlag: "protectSVG", section: "SVG-API"},
					{mainFlag: "protectTextMetrics", section: "TextMetrics-API"},
					{mainFlag: "protectNavigator", section: "Navigator-API"},
					{mainFlag: "protectScreen", section: "Screen-API"},
				].forEach(function(api){
					if (settings.get(api.mainFlag) !== (api.mainFlagDisabledValue || false)){
						const sectionKeys = getSectionKeys(api.section);
						if (sectionKeys.some(function(key){
							return protectedFeaturesValue.hasOwnProperty(key) &&
								!protectedFeaturesValue[key];
						})){
							const all = sectionKeys.every(function(key){
								return protectedFeaturesValue.hasOwnProperty(key) &&
									!protectedFeaturesValue[key];
							});
							const resolutions = [
								{
									label: extension.getTranslation("sanitation_resolution.enableFeatures"),
									callback: function(){
										const protectedFeaturesValue = protectedFeatures.get();
										sectionKeys.forEach(function(key){
											protectedFeaturesValue[key] = true;
										});
										protectedFeatures.set(protectedFeaturesValue);
									}
								},
							];
							if (all){
								resolutions.push({
									label: extension.getTranslation("sanitation_resolution.disableMainFlag"),
									callback: function(){
										settings.set(api.mainFlag, api.mainFlagDisabledValue || false);
									}
								});
							}
							errorCallback({
								message: createErrorMessage(api, all),
								severity: all? "high": "medium",
								resolutions
							});
						}
					}
				});
			}
		},
		{
			name: "blockMode",
			check: function(errorCallback){
				const blockMode = settings.blockMode;
				const protectedCanvasPart = settings.protectedCanvasPart;
				if (!blockMode.match("^fake|^ask")){
					errorCallback({
						message: extension.getTranslation("sanitation_error.badBlockMode"),
						severity: "medium",
						resolutions: [{
							label: extension.getTranslation("sanitation_resolution.switchToFake"),
							callback: function(){
								settings.blockMode = "fake";
							}
						}]
					});
				}
				if (blockMode === "fake" && protectedCanvasPart === "input" && settings.rng === "white"){
					errorCallback({
						message: extension.getTranslation("sanitation_error.fakeInputWithWhiteRng")
							.replace(/{blockMode}/g, extension.getTranslation("blockMode_options." + blockMode))
							.replace(
								/{protectedCanvasPart}/g,
								extension.getTranslation("protectedCanvasPart_options." + settings.protectedCanvasPart)
							),
						severity: "low",
						resolutions: [
							{
								label: extension.getTranslation("sanitation_resolution.switchToProtectReadout"),
								callback: function(){
									settings.protectedCanvasPart = "readout";
								}
							},
							{
								label: extension.getTranslation("sanitation_resolution.switchToNonPersistentRng"),
								callback: function(){
									settings.rng = "nonPersistent";
								}
							}
						]
					});
				}
				if (blockMode === "fake" && protectedCanvasPart === "everything"){
					errorCallback({
						message: extension.getTranslation("sanitation_error.fakeEverythingInCanvas")
							.replace(/{blockMode}/g, extension.getTranslation("blockMode_options." + blockMode))
							.replace(
								/{protectedCanvasPart}/g,
								extension.getTranslation("protectedCanvasPart_options." + settings.protectedCanvasPart)
							),
						severity: "low",
						resolutions: [
							{
								label: extension.getTranslation("sanitation_resolution.switchToProtectReadout"),
								callback: function(){
									settings.protectedCanvasPart = "readout";
								}
							},
							{
								label: extension.getTranslation("sanitation_resolution.switchToProtectInput"),
								callback: function(){
									settings.protectedCanvasPart = "input";
								}
							}
						]
					});
				}
			}
		},
		{
			name: "thresholds",
			check: function(errorCallback){
				const setToLabel = extension.getTranslation("sanitation_resolution.setTo");
				const tooLowLabel = extension.getTranslation("sanitation_error.valueTooLow");
				const tooHighLabel = extension.getTranslation("sanitation_error.valueTooHigh");
				if (settings.minFakeSize > 1e2){
					errorCallback({
						message: tooHighLabel
							.replace(/{setting}/g, extension.getTranslation("minFakeSize_title"))
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
							.replace(/{setting}/g, extension.getTranslation("maxFakeSize_title"))
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
							.replace(/{setting}/g, extension.getTranslation("ignoreFrequentColors_title"))
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
							.replace(/{setting}/g, extension.getTranslation("minColors_title"))
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
				const disableLabel = extension.getTranslation("sanitation_resolution.disableFlag");
				if (settings.storeNotificationData){
					errorCallback({
						message: extension.getTranslation("sanitation_error.storeNotificationData"),
						severity: "low",
						resolutions: [{
							label: disableLabel
								.replace(/{flag}/g, extension.getTranslation("storeNotificationData_title")),
							callback: function(){
								settings.storeNotificationData = false;
							}
						}]
					});
					if (settings.storeImageForInspection){
						errorCallback({
							message: extension.getTranslation("sanitation_error.storeImage"),
							severity: "low",
							resolutions: [{
								label: disableLabel
									.replace(/{flag}/g, extension.getTranslation("storeImageForInspection_title")),
								callback: function(){
									settings.storeImageForInspection = false;
								}
							}]
						});
					}
				}
			}
		},
		{
			name: "privacy",
			check: function(errorCallback){
				if (settings.sharePersistentRndBetweenDomains){
					errorCallback({
						message: extension.getTranslation("sanitation_error.doNotSharePersistentRndBetweenDomains"),
						severity: "high",
						resolutions: [{
							label: extension.getTranslation("sanitation_resolution.disableFlag")
								.replace(/{flag}/g, extension.getTranslation("sharePersistentRndBetweenDomains_title")),
							callback: function(){
								settings.sharePersistentRndBetweenDomains = false;
							}
						}]
					});
				}
				if (settings.protectScreen && settings.screenSize){
					errorCallback({
						message: extension.getTranslation("sanitation_error.customScreenSize"),
						severity: "medium",
						resolutions: [{
							label: extension.getTranslation("sanitation_resolution.setTo")
								.replace(/{value}/g, "\"\""),
							callback: function(){
								settings.screenSize = "";
							}
						}]
					});
				}
			}
		},
	];
}());