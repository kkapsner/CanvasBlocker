reCAPTCHA is not working!
-----
It's a known fact that the window API protection breaks reCAPTCHAs. The use the window.name API to store information about the captcha. The protection is designed to mitigate exactly such techniques of passing information from one domain to another. But in this case the information is shared with an embedded HTML page (an <iframe> tag). As the information gets lost when the top level page navigates somewhere the tracking potential is quite limited in such a scenario.

So in conclusion you can enable "Allow window.name in frames" to make reCAPTCHA work and still don't have to worry to much about tracking with window.name.