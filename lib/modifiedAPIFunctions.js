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
		scope = require.register("./modifiedAPIFunctions", {});
	}
	
	scope.checkerWrapper = function checkerWrapper(checker, object, args, callback){
		const check = checker.call(object);
		if (check.allow){
			if (check.allow === true){
				return args.length?
					check.original.call(object, ...args):
					check.original.call(object);
			}
			return callback.call(object, args, check);
		}
		check.notify("blocked");
		return undefined;
	};
	
	scope.getStatusByFlag = function getStatusByFlag(flag){
		return function getStatus(obj, status, prefs){
			status = Object.create(status);
			status.active = prefs(flag, status.url);
			return status;
		};
	};
	
	scope.setFunctionProperties = function setFunctionProperties(functions, data){
		Object.keys(functions).forEach(function(key){
			const func = functions[key];
			["type", "api", "getStatus"].forEach(function(property){
				if (data[property] && !func[property]){
					func[property] = data[property];
				}
			});
		});
	};
	
	scope.setGetterProperties = function setGetterProperties(getters, data){
		getters.forEach(function(getter){
			["type", "api", "getStatus"].forEach(function(property){
				if (data[property] && !getter[property]){
					getter[property] = data[property];
				}
			});
		});
	};
	
	scope.setProperties = function setProperties(functions, getters, data){
		scope.setFunctionProperties(functions, data);
		scope.setGetterProperties(getters, data);
	};
}());