This add-on allows users to prevent websites from using the some Javascript APIs to fingerprint them. Users can choose to block the APIs entirely on some or all websites (which may break some websites) or just block or fake its fingerprinting-friendly readout API.

More information on fingerprinting can be found at:
 * &lt;canvas&gt;: http://www.browserleaks.com/canvas
 * audio:
   * https://audiofingerprint.openwpm.com/ (very poorly written = slow)
   * https://webtransparency.cs.princeton.edu/webcensus/#audio-fp
 * DOMRect:
   * http://jcarlosnorte.com/security/2016/03/06/advanced-tor-browser-fingerprinting.html
   * https://browserleaks.com/rects

The different block modes are:
 * fake: Canvas Blocker's default setting, and my favorite! All websites not on the white list or black list can use the protected APIs. But values obtained by the APIs are altered so that a consistent fingerprinting is not possible
 * ask for permission: If a website is not listed on the white list or black list, the user will be asked if the website should be allowed to use the protected APIs each time they are called.
 * block everything: Ignore all lists and block the protected APIs on all websites.
 * allow only white list: Only websites in the white list are allowed to use the protected APIs.
 * block only black list: Block the protected APIs only for websites on the black list.
 * allow everything: Ignore all lists and allow the protected APIs on all websites.

Protected "fingerprinting" APIs:
 * canvas 2d
 * webGL
 * audio
 * history
 * window (disabled by default)
 * DOMRect

Special thanks to:
 * spodermenpls for finding all the typos
 * Thorin-Oakenpants for the icon idea
 * anthologist for the Italian translation
 * Maleficient for the French translation
 * yfdyh000 for the Chinese translation
 * micrococo for the Spanish translation
 * STim99 for the Russian translation

If you want to support this addon you can donate to the following bitcoin address:
	159Y9BLcfHyrp6wj6f3syEuk92xkRVTiie