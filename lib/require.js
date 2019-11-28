/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const require = function(){
	"use strict";
	if (!window.scope){
		window.scope = {};
	}
	const scope = window.scope;

	function getScopeName(module){
		const scopeName = module.replace(/^\..*\//, "").replace(/\..+/, "");
		// console.log(scopeName);
		return scopeName;
	}

	function require(module){
		if (module.startsWith(".")){
			const scopeName = getScopeName(module);
			return scope[scopeName];
		}
		throw new ReferenceError("Unable to get non relative module " + module + "!");
	}
	
	require.register = function(moduleName, module = {}){
		const scopeName = getScopeName(moduleName);
		if (!scope.hasOwnProperty(scopeName)){
			scope[scopeName] = module;
			return module;
		}
		else {
			require("./logging").error("Module", moduleName, "already registered.");
			return scope[scopeName];
		}
	};
	
	require.exists = function(module){
		return scope.hasOwnProperty(getScopeName(module));
	};

	return require;
}();