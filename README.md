# Pushbullet notifications for Athom Homey

This app lets you send Pushbullet notifications to use in flows on a Homey device (by Athom).

1. Go to settings on your Homey, and under Pushbullet Notifications login to Pushbullet.
2. When logged in successfully, you are now able to send Pushbullet notifications.

Use Then flow cards to send Push notifications to all devices or a single device

![PB Single][pb-image1] ![PB All][pb-image2]

Or use the trigger card to trigger a flow by sending a Pushbullet from your device/webbrowser

![PB Trigger][pb-image3]

### Donate
If the Pushbullet app is useful to you, buy me a beer!

[![Paypal donate][pp-donate-image]][pp-donate-link]

[pp-donate-link]: https://www.paypal.com/cgi-bin/webscr?cmd=_donations&business=D8RA9P824YZ62&lc=NL&item_name=Pushbullet%2dHomey&currency_code=EUR&bn=PP%2dDonationsBF%3abtn_donateCC_LG%2egif%3aNonHosted
[pp-donate-image]: https://www.paypalobjects.com/en_US/i/btn/btn_donateCC_LG.gif
[pb-image1]: http://bmwcodingdatabase.com/images/PB1.png
[pb-image2]: http://bmwcodingdatabase.com/images/PB2.png
[pb-image3]: http://bmwcodingdatabase.com/images/PB3.png

### Changelog

0.0.5

- Added support for sending Image Token from Image Grabber app, or other apps that can generate a Image token

0.0.4
*** If already using Pushbullet before V0.0.4 be sure to sign off and on again on the settings page ***
- Added trigger support, it is now possible to send Homey a notification, use the trigger card in your flows.

0.0.3

- Added check to see if Message isn't empty to fix app crash
- Added Insight logging support

0.0.2

- Fixed bug where IOS devices would not show message in notification screen.
