This add-on allows users to prevent websites from using the Javascript &lt;canvas&gt; API to fingerprint them. Users can choose to block the &lt;canvas&gt; API entirely on some or all websites (which may break some websites) or just block or fake its fingerprinting-friendly readout API. More information on &lt;canvas&gt; fingerprinting can be found at http://www.browserleaks.com/canvas.

The different block modes are:
<ul>
<li>block readout API: All websites not on the white list or black list can use the &lt;canvas&gt; API to display something on the page, but the readout API is not allowed to return values to the website.</li>
<li>fake readout API: Canvas Blocker's default setting, and my favorite! All websites not on the white list or black list can use the &lt;canvas&gt; API to display something on the page, but the readout API is forced to return a new random value each time it is called.</li>
<li>ask for readout API permission: All websites not on the white list or black list can use the &lt;canvas&gt; API to display something on the page, but the user will be asked if the website should be allowed to use the readout API each time it is called.</li>
<li>block everything: Ignore all lists and block the &lt;canvas&gt; API on all websites.</li>
<li>allow only white list: Only websites in the white list are allowed to use the &lt;canvas&gt; API.</li>
<li>ask for permission: If a website is not listed on the white list or black list, the user will be asked if the website should be allowed to use the &lt;canvas&gt; API each time it is called.</li>
<li>block only black list: Block the &lt;canvas&gt; API only for websites on the black list.</li>
<li>allow everything: Ignore all lists and allow the &lt;canvas&gt; API on all websites.</li>
</ul>

At present, only my domain (kkapsner.de) is whitelisted by default.
