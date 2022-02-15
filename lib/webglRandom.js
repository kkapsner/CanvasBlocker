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
		scope = require.register("./webglRandom", {});
	}
	
	let randomSupply = null;
	scope.setRandomSupply = function(supply){
		randomSupply = supply;
	};
	
	const windowHashes = new WeakMap();
	function getWindowStorage(window){
		let storage = windowHashes.get(window);
		if (!storage){
			const vendorRng = randomSupply.getIndexRng(1, scope.vendors.length, window);
			const vendorIndex = vendorRng(0);
			storage = {vendorIndex};
			const vendor = scope.vendors[vendorIndex];
			if (vendor.getRandomRenderer){
				vendor.renderers = [vendor.getRandomRenderer(window)];
				storage.rendererIndex = 0;
			}
			else {
				const rendererRng = randomSupply.getIndexRng(1, vendor.renderers.length, window);
				storage.rendererIndex = rendererRng(0);
			}
			windowHashes.set(window, storage);
		}
		return storage;
	}
	function getRandomVendorIndex(window){
		return getWindowStorage(window).vendorIndex;
	}
	function getRandomRendererIndex(window){
		return getWindowStorage(window).rendererIndex;
	}
	scope.getRandomVendor = function getRandomVendor(window){
		return scope.vendors[getRandomVendorIndex(window)].vendor;
	};
	scope.getRandomRenderer = function getRandomRenderer(window){
		
		const vendor = scope.vendors[getRandomVendorIndex(window)];
		return vendor.renderers[getRandomRendererIndex(window)];
	};
	scope.pickOneFromTree = function pickOneFromTree(treeString, window){
		function pickOne(string){
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
			const optionRng = randomSupply.getIndexRng(1, options.length, window);
			return {value: options[optionRng(0)], endIndex: index};
		}
		return pickOne(treeString).value;
	};
	
	scope.vendors = [
		{
			vendor: "Chromium",
			renderers: [
				"Chromium",
			]
		},
		{
			vendor: "Intel Inc.",
			renderers: [
				"Intel GMA X3100 OpenGL Engine",
				"Intel HD Graphics 3000 OpenGL Engine",
				"Intel HD Graphics 4000 OpenGL Engine",
				"Intel HD Graphics 5000 OpenGL Engine",
				"Intel Iris OpenGL Engine",
				"Intel Iris Pro OpenGL Engine",
			]
		},
		{
			vendor: "Intel Open Source Technology Center",
			renderers: [
				"Mesa DRI Intel(R) Haswell Mobile",
				"Mesa DRI Intel(R) Ironlake Mobile",
				"Mesa DRI Intel(R) Ivybridge Mobile x86/MMX/SSE2",
				"Mesa DRI Intel(R) Ivybridge Mobile",
				"Mesa DRI Intel(R) Sandybridge Desktop x86/MMX/SSE2",
				"Mesa DRI Intel(R) Sandybridge Desktop",
				"Mesa DRI Intel(R) Sandybridge Mobile x86/MMX/SSE2",
				"Mesa DRI Intel(R) Sandybridge Mobile",
			]
		},
		{
			vendor: "Google Inc.",
			getRandomRenderer: function(window){
				const words = "Series|Graphics|Chipset|Express|Family|nForce|Dual|NVIDIA|800|600|300|FireGL|Mobility|Radeon|series|FirePro|Optiplex|WDDM|200|400|700|70M|50M|Driver|200M".split("|");
				const compressed = "ANGLE (<A<MD <760G|(ATI) $f M8900 ($b) $c Pro $1|$f <2270|W5000 ($b V) $1 Adapter>|M880G with ATI $c $d HD 42<00 |50>|$d< <HD<6<370D $1|410D $1>|77<00 $0|70>| <5<450|5<00 $0|70>|670|$k $0|$8 $0>|6<2<50< $1|M >|90 $1>|3<00 $e $1|10< $1 |M>|20< <$1 |$e $1>|M>|50|70<D|M>>|4<00M $0|10D|50A $1|$l |80G>|5<00< $0|M/5600/5700 $0>|10 $0|20G|30D $1|50A|70>|6<20G|30M|50A $1|70>|7<00 $0|30M>|$8 $0|900< $0|M $0>>|7<000 $e|290 $1|3<00 $0 $1|10< $1|M>|40< $1|G|M>>|4<00M $0|20G|50 $1|$l|80D>|5<00< $0|/7600 $0|G|M/7600M $0>|20G + 7670M $6 $1|40D|$m/7650M $1|60D|70< $1|M>|80D>|6<00<G + 6400M $6 $1|M $0>|10M|40G + <76<00M $6 $1|$l $6 $1>|8750M $6 $1>|$m|60<D|G + 7600M $6 $1>|$l>|$k $0|$8 $0|900 $0>|8<2<10|40|50>|3<30|50>|4<00|50G|70D>|5<10G|50G + <8570M $6 $1|HD 8600/8700M $6 $1>|70D>|6<10G + 8500M $6 $1|50G + 8<670M $6 $1|750M $6 $1>|70D>>>>|R<7 $i $0|9 $i $0>>|(TM) HD <6<380G|480G|520G |620G>|7450>>>|SUS <EAH<4350 $e|5<450 $0|670 $0|770 $0>|6<450 $0|670 $0|970 $0>>|HD7770 $0|R9 270 $0>|TI <$f <2450|V<3<$k ($b)|$8>|4800 ($b)>>|$c $d <9600/9700 $0|HD <2<$j XT|$9>|3<4<00 $0|30|50|70>|650>|4<2<00 $0|50 $1>|3<00< $0|/4500 $0>|30>|5<00< $0|/5100 $0>|30 $0|70>|650>|5<000 $0|145|4<00 $0 |30|5<0|v>|70 >|650>|6<370|550>>|X1<$a|$9>>|$d <2100|3<000 $1|100 $1>|HD<4670| <2<350|$j <P<ro |RO>|$0|XT >|$9 <P<ro |RO>|XT>>|3<$i $1|$a $1|4<00 $0|50 - Dell $g|70 - Dell $g>|6<00 $0|50>|$8 $0>|4<2<00|50 $1>|3<00< $0|/4500 $0>|50 $0>|550|6<00 Seri<es |si>|50|70>|770|8<00 $0|70 X2>>|5<4<00 $0|50>|570|6<00 $0|70>|$k $0|$8 $0>|6<230|350>>>|X<1<050|2<00 $0|50|70>>|$a/X550/X1050 $0|press <1<1<00|50 $0>|2<00 $0|50>>|$i $0>>>>>|Intel(R) <4 $0 Internal $2|829<15G/GV/910GL $3 $2 $4|45G $3 $2 $4>|946GZ $3 $2 $4|B43 $3 $2|G<33/G31 $3 $2 $4|4<1 $3 $2|5/G43 $3 $2>|965 $3 $2 $4|raphics Media Accelerator <3<150|$9 $0>|HD >>|HD $1 <3000|4<000|$j|$9>|$4>|Q<3<3 $3 $2 $4|5 $3 $2 $4>|45/Q43 $3 $2|965/Q963 $3 $2 $4>>|M<icrosoft Basic Render $n|obile Intel(R) <4<5 $3 $2 $4| $0 $3 $2 $4>|9<15GM/GMS,910GML $3 $2 $4|45< $3 $2 $4|GM $3 $2 $4>|65 $3 $2 $4>|- famiglia $3 $2 45|HD $1>>|$7 <GeForce <210 |31<0M |5M>|4<05M|10M>|6<05|1<0<0 $5 405|M>|50< LE|SE $5 430>>|$i TurboCache(TM)|500|$9>|7<0<00M / $5 610M|25 / $7 $5 630a |50 </ $7 $5 620i|PV / $7 $5 630a>>|1<00 </ $7 $5 630i|GS>|$m / $5 630M>|$a <G<S|T>|LE|SE/7200 GS>|900 GS>|8<$o G|$a GS |$j< GS|GS|M G<S|T>>|500 GT|$9< G<S|T< |S>>|GS|M G<S|T>>|$8 G<S|TS 512>>|9<100|$o GS|$a< GE|M GS >|$j< GT |M >|500< G<S|T>|M GS>|6<00< G<SO 512|T>|M G<S|T>>|$m GT>|700M GTS|$8 GT< |X/9800 GTX+>>|FX 5200|G<10<0|2M|5M>|210< |M>| 10<3M |5M >|o 7300|T< <120M|2<20|30M |40M >|3<20M|3<0M |5M>>|4<2<0M|5M>|30|40>|5<2<0M|5M>|30|45|55M>|6<10|2<0|5>|3<0M|5>|40< |M>|$m>|7<40M|55M>>|S <2<40|50>|350M|450 >|X <2<60|75|85|95>|4<60< SE|M>|80>|5<50 Ti|60< Ti |M>|70|80M>|6<50 Ti BOOST|60< Ti|M >|7<0|5M>|80|90>|7<60 (192-bit)|70|80>>>>>|ION|MCP67M|$5 750a SLI|NVS <3<00|100M >|4200M|5<100M|$o|400M >>|Quadro <1000M|2000M|$9|FX <1<500M|$k|$8>|2<500M|700M>|3700|5<70|80>|770M|880M>|K<3000M|$9>|NVS <1<10M|35M|40M|60M>|2<85|90>>>>|R<adeon <(TM) HD 64<$l|90M>|HD 6470M|X<1<$a/X1550 $0|550 <64-bit|$0>|650 S<E|eries >|950 $0>|$a/X550/X1050 $0|$8 GTO>>|DPDD Chained DD|oyal BNA $n|S880>|SiS Mirage 3 $1|VIA Chrome9 HC IGP $4 $h|WinFast GT 640($7)><| (Microsoft Corporation< <$h 1.1) |- $h< <1.<0)|1)|2)>|v1.<1)|2<0)|)>|3)>>|)>>|- $h v1.<1)|20)>>>< Direct3D<11 vs_<4_<0 ps_4_0|1 ps_4_1>|5_0 ps_5_0>|9<Ex|> vs_<0_0 ps_<2_0|3_0>|2_0 ps_2_0|3_0 ps_3_0>>|>)".replace(
					/\$([0-9a-z]+)/gi,
					function(m, index){
						return words[parseInt(index, 36)];
					}
				);
				return scope.pickOneFromTree(compressed, window);
				
			}
		},
		{
			vendor: "NVIDIA Corporation",
			renderers: [
				"GeForce 8600M GT/PCIe/SSE2",
				"GeForce GT 430/PCIe/SSE2",
				"GeForce GT 520/PCIe/SSE2",
				"GeForce GTX 650 Ti/PCIe/SSE2",
				"GeForce GTX 680/PCIe/SSE2",
				"GeForce GTX 770/PCIe/SSE2",
				"NVIDIA GeForce 320M OpenGL Engine",
				"NVIDIA GeForce 8600M GT OpenGL Engine",
				"NVIDIA GeForce 8800 GS OpenGL Engine",
				"NVIDIA GeForce 8800 GT OpenGL Engine",
				"NVIDIA GeForce 9400 OpenGL Engine",
				"NVIDIA GeForce 9400M OpenGL Engine",
				"NVIDIA GeForce 9600M GT OpenGL Engine",
				"NVIDIA GeForce GT 130 OpenGL Engine",
				"NVIDIA GeForce GT 330M OpenGL Engine",
				"NVIDIA GeForce GT 640M OpenGL Engine",
				"NVIDIA GeForce GT 650M OpenGL Engine",
				"NVIDIA GeForce GT 750M OpenGL Engine",
				"NVIDIA GeForce GTX 660M OpenGL Engine",
				"NVIDIA GeForce GTX 675MX OpenGL Engine",
				"NVIDIA GeForce GTX 680MX OpenGL Engine",
				"Quadro 2000/PCIe/SSE2",
				"Quadro 2000M/PCIe/SSE2",
				"Quadro FX 1800/PCIe/SSE2",
				"Quadro K600/PCIe/SSE2",
			]
		},
		{
			vendor: "VMware, Inc.",
			renderers: [
				"Gallium 0.4 on i915 (chipset: Pineview M)",
				"Gallium 0.4 on llvmpipe (LLVM 3.2, 128 bits)",
			]
		},
		{
			vendor: "TransGaming Inc.",
			renderers: [
				"SwiftShader",
			]
		},
	];
}());