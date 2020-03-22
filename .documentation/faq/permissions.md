Why does CanvasBlocker need permission X?
------
Here is the list of permission that CanvasBlocker needs and the reason why it's needed:

 * <all_urls> and tabs: CanvasBlocker needs to be able to interact with all possible urls and tabs as fingerprinting attempts could be done everywhere.
 * storage: to store the settings the storage.local API is used.
 * webRequest and webRequestBlocking: to insert the CSR headers in a request in order to protect the data-URLs. Once [this bug](https://bugzilla.mozilla.org/show_bug.cgi?id=1475831) has been fixed I can completely remove the data-URI protection (see [here](https://github.com/kkapsner/CanvasBlocker/issues/208) for further information).
 * contextualIdentities and cookies: for support of browser containers. I would like to make this optional for only the people that use containers but I cannot (see [here](https://github.com/kkapsner/CanvasBlocker/issues/381) for further information).
 * privacy: this permission is needed to read if the user has privacy.resistFingerprinting enabled. A notice about a slightly changed behaviour of CanvasBlocker is displayed in the settings page in that case.