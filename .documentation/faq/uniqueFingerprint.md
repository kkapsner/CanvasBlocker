Page X claims my fingerprint is unique.
------
Having a unique fingerprint is fine as long as it changes. With the default settings of CanvasBlocker the fingerprint should change all the time. But also with other settings (e.g. the stealth preset) that do not change the fingerprint all the time the fingerprint should be unique per domain and therefore prevent tracking. To test this you can check the different fingerprints on [canvasblocker.kkapsner.de](https://canvasblocker.kkapsner.de/test/) and [canvasblocker2.kkapsner.de](https://canvasblocker2.kkapsner.de/test/).

My fingerprint does not change when I reload page X.
------
Some pages do not recalculate the fingerprint upon reload. Make sure you force the recomputation.
But also some CanvasBlocker settings make it to not change the fingerprint upon reload (e.g. the stealth preset).

If you have privacy.resistFingerprinting enabled the fingerprints also may stay the same. But in this case you are not trackable as the fingerprint does not leak any information about your system. See [here](https://github.com/kkapsner/CanvasBlocker/issues/158) and [here](https://github.com/ghacksuserjs/ghacks-user.js/issues/767) for further information.