"use strict";

const Homey = require('homey');
const https = require('https');
const querystring = require('querystring');
const Pushbullet = require('pushbullet');
const W3CWebSocket = require('websocket').w3cwebsocket;
const fs = require('fs');

let account = [];
let user_info = [];
let devices = null;
let pushbulletToken;
let ledringPreference = false;
let homeyDevice = null;
let INSIGHTS = null;

/*
	Flow cards
*/
new Homey.FlowCardAction('pushbulletSend').register().registerRunListener(async (args, state) => {
	return new Promise(function (resolve, reject) {
		if (typeof pushbulletToken == 'undefined' || pushbulletToken == '') return reject(new Error("Pushbullet not logged in under settings!"));
		const pMessage = args.message;
		if (typeof pMessage == 'undefined' || pMessage == null || pMessage == '') return reject(new Error("Message cannot be empty!"));
		pushbulletSend(pushbulletToken, pMessage);
		return resolve(true); // we've fired successfully
	});
})

new Homey.FlowCardAction('pushbulletSend_device').register().registerRunListener(async (args, state) => {
	return new Promise(function (resolve, reject) {
		if (typeof pushbulletToken == 'undefined' || pushbulletToken == '') return reject(new Error("Pushbullet not logged in under settings!"));
		const pMessage = args.message;
		if (typeof pMessage == 'undefined' || pMessage == null || pMessage == '') return reject(new Error("Message cannot be empty!"));
		const pDevice = args.device.iden;
		if (pDevice == null || pDevice == '') return reject(new Error("No devices registered on this Pushover account!"));
		pushbulletSend(pushbulletToken, pMessage, pDevice);
		return resolve(true);
	});
}).getArgument('device')
	.registerAutocompleteListener((query, args) => {
		return new Promise(function (resolve, reject) {
			const deviceSearchString = value.query;
			const items = searchForDevicesByValue(deviceSearchString);
			return resolve(items);
		}); // we've fired successfully
	});

new Homey.FlowCardAction('pushbulletSend_image').register().registerRunListener(async (args, state) => {
	return new Promise(function (resolve, reject) {
		if( typeof pushbulletToken == 'undefined' || pushbulletToken == '') return reject( new Error("Pushbullet not logged in under settings!") );
		var pImage = args.image;
		if( typeof pImage == 'undefined' || pImage == null || pImage == '') return reject( new Error("Image token cannot be empty!") );
		pushbulletSend_image ( pushbulletToken, pImage);
		return resolve(true); // we've fired successfully
	});
})

/*
	Search device function for auto-complete in flow card.
*/
function searchForDevicesByValue ( value ) {
	const possibleDevices = devices;
	const tempItems = [];
	for (let i = 0; i < devices.length; i++) {
		const tempDevice = possibleDevices[i].nickname;
		const tempIden = possibleDevices[i].iden;
		if ( tempDevice.indexOf(value) >= 0 ) {
			tempItems.push({ icon: "", name: tempDevice, iden: tempIden });
		}
	}
	return tempItems;
}

/*
 Send notification
 */
function pushbulletSend ( pToken , pMessage, pDeviceParams) {
	if (pToken != ""){
		const pusher = new Pushbullet(pToken);

		pusher.note(pDeviceParams, pMessage, function(error, response) {
				// response is the JSON response from the API
				if (response != null){
					if (response.active == true) {

						if (ledringPreference == true){
							LedAnimate("green", 3000);
						}
					} else {
						if (ledringPreference == true){
							LedAnimate("red", 3000);
						}
					}
				}
		});

		//Add send notification to Insights
		INSIGHTS.createEntry(1, new Date(), function(err, success){
				if( err ) return Homey.error(err);
		});
	}
}

/*
 Decode image and upload
 */
function pushbulletSend_image ( pToken , pImage, pDeviceParams) {
	if (pToken != ""){
		const pusher = new Pushbullet(pToken);
		const base64Data = pImage;

		fs.writeFile("/userdata/pushbullet-image.jpg", base64Data, 'base64', function(err) {
			console.log(err);
			console.log('Pushbullet - File written');
			});

		pusher.file(pDeviceParams, '/userdata/pushbullet-image.jpg', function(error, response) {
				// response is the JSON response from the API
						if (response != null){
							if (response.active == true) {

								if (ledringPreference == true){
									LedAnimate("green", 3000);
								}
							} else {
								if (ledringPreference == true){
									LedAnimate("red", 3000);
								}
							}
						}
		});

		//Add send notification to Insights
		INSIGHTS.createEntry(1, new Date(), function (err, success) {
			if (err) return Homey.error(err);
		});
	}
}

/*
	Set arrays
*/
function pushbulletBoot () {
	devices = null;
	devices = Homey.ManagerSettings.get('userdevices');
	user_info = null;
	user_info = Homey.ManagerSettings.get('userinfo');
	if (user_info != null){
		pushbulletToken = user_info.token;
	};
	homeyDevice = Homey.ManagerSettings.get('homeyDevice');
}

/*
	Get users devices
*/
function getDevices ( token) {
	const pusher = new Pushbullet(token);

	pusher.devices(function(err, response) {
		if( response != null){
			const tempDevices = response;
			devices = [];
			for (let i = 0; i < tempDevices.devices.length; i++){

				if(tempDevices.devices[i].active == true){
					devices.push({
						iden: tempDevices.devices[i].iden,
						nickname: tempDevices.devices[i].nickname,
						model: tempDevices.devices[i].model
					});
				};

			};
			Homey.ManagerSettings.set('userdevices', devices);
			console.log('Pushbullet - Devices saved');
		};
	});
}


/*
	Get user info and save in userinfo setting
*/
function getUserInfo ( token, callback) {
	const pusher = new Pushbullet(token);

	pusher.me(function(err, response) {
			Homey.ManagerSettings.set('userinfo', {
				name	: response.name,
				email : response.email,
				token : token
		});
			console.log('Pushbullet - Userinfo saved');
			callback(true);
		});
}

/*
	Create device ID for Homey
*/
function createHomeyDevice ( token, callback) {
	const pusher = new Pushbullet(token);

	if (typeof homeyDevice == 'undefined' || homeyDevice == null){
			pusher.createDevice('Homey', function(error, response){
				Homey.ManagerSettings.set('homeyDevice', {
					name : response.nickname,
					iden : response.iden
				});
				homeyDevice = Homey.ManagerSettings.get('homeyDevice');
				console.log('Pushbullet - Pushbullet device created for Homey');
			});
		}
		callback(true);
}

/*
	Listen for new Pushes
*/
function listenForPushbullet ( token ) {
	console.log('Pushbullet - Starting listener')
	const pusher = new Pushbullet(token);
	if (homeyDevice != null){
		const client = new W3CWebSocket('wss://stream.pushbullet.com/websocket/' + token);

		client.onerror = function() {
    	console.log('Pushbullet - Connection Error');
		};

		client.onopen = function() {
    	console.log('Pushbullet - WebSocket Client Connected');
		};

		client.onclose = function() {
    console.log('Pushbullet - echo-protocol Client Closed');
		};

		client.onmessage = function(e) {
    if (typeof e.data === 'string') {
		const listener = JSON.parse(e.data);
		console.log("Pushbullet - Received: '" + e.data + "'");
				if (listener.type == 'tickle' && listener.subtype == 'push'){
					const options = {
						limit: 10
					};

					// Search for pushes
					pusher.history(options, function(error, response) {
						if (response != null){
							const tempPush = response;
							for (let i = 0; i < tempPush.pushes.length; i++){
								if (tempPush.pushes[i].active == true && tempPush.pushes[i].target_device_iden == homeyDevice.iden){
									console.log(tempPush.pushes[i].body + ' ' + tempPush.pushes[i].iden);

									// Trigger flow
									Homey.manager('flow').trigger('pushbulletReceived', {
										message: tempPush.pushes[i].body
									});
									// Delete push
									pusher.deletePush(tempPush.pushes[i].iden, function(error, response) {});

								}
							}
						}
					});
				}
    	}
		};
	}
}


/*
	Authorize with Pushbullet using Oauth2
*/
function authorize ( callback) {

	callback = callback || function(){}

	let callback_called = false;

	Homey.manager('cloud').generateOAuth2Callback(
		'https://www.pushbullet.com/authorize?client_id=' + Homey.env.CLIENT_ID + '&redirect_uri=' + Homey.env.REDIRECT_URI + '&response_type=code',
		onGotUrl,
		onGotCode
	);

	function onGotUrl( err, url ){
		if( err ) return callback(err);
		console.log('Pushbullet - Got url!');
		callback( null, url );
		callback_called = true;
	}

	function onGotCode( err, code ) {
		if( err ) {
		    Homey.manager('api').realtime('authorized', false);
			return Homey.error(err);
		}

		console.log('Pushbullet - Got authorization code!');

		const data = querystring.stringify({
			'client_id': Homey.env.CLIENT_ID,
			'client_secret': Homey.env.CLIENT_SECRET,
			'code': code,
			'grant_type': 'authorization_code'
		});

		const options = {
			host: 'api.pushbullet.com',
			path: '/oauth2/token',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(data)
			}
		};

		const req = https.request(options, function (res) {
			res.setEncoding('utf8');
			let body = "";
			res.on('data', function (chunk) {
				body += chunk;
			});
			res.on('end', function(){
				try {
					body = JSON.parse(body);

				    if( body.token_type !== 'Bearer' ) {
					    Homey.manager('api').realtime('authorized', false);
					    return Homey.error( "body not ok" );
					}

					Homey.ManagerSettings.set('auth', {
						access_token: body.access_token
					});

					pushbulletToken = body.access_token;

					Homey.manager('api').realtime('authorized', true);

					getUserInfo(pushbulletToken, function (err, data) {
						if (data = true) {
							getDevices(pushbulletToken);
							createHomeyDevice(pushbulletToken, function (err, data) {
								if (data = true) {
									setTimeout(function () {
										listenForPushbullet(pushbulletToken);
									}, 5000);
								}
							});
						}
					});

				} catch (e) {
					Homey.manager('api').realtime('authorized', false);
					Homey.error(e);
				}
			})
		});

		req.write(data);
			req.end();
		}
	}
/*
	Create insight log
*/
function createInsightlog() {
	const logName = 'pushbullet_sendNotifications';
	Homey.ManagerInsights.createLog(logName, {
			title: {
				en: 'Send Notifications'
			},
			type: 'number',
			units: {
				en: 'notifications'
			},
			decimals: 0
		},
		function (err, log) {
			if (err) {
				if (err.code === 409) { // Log already created
					if (log) INSIGHTS = log;
					else { // Get log if needed
						Homey.ManagerInsights.getLog(logName, function (err, log) {
							INSIGHTS = log;
						});
					}
				} else {
					console.error(err)
				}
			} else {
				INSIGHTS = log;
			}
		}
	);
}

/*
	Animation for ledring
*/
function LedAnimate(colorInput, duration) {
Homey.manager('ledring').animate(
    // animation name (choose from loading, pulse, progress, solid)
    'pulse',

    // optional animation-specific options
    {

	   color: colorInput,
        rpm: 300 // change rotations per minute
    },

    // priority
    'INFORMATIVE',

    // duration
    duration,

    // callback
    function( err, success ) {
        if( err ) return Homey.error(err);

    }
);
}

/*
	Init Pushbullet app
*/
class App extends Homey.App {
	onInit() {
		console.log('Pushbullet - app ready');
		pushbulletBoot();
		createInsightlog();

		if (homeyDevice != null) {
			setTimeout(function () {
				listenForPushbullet(pushbulletToken);
			}, 5000);
		}

		Homey.ManagerSettings.on('set', function (settingname) {
			if (settingname == 'ledring') {
				console.log('Pushbullet - Ledring preference has been changed...');
				account = Homey.ManagerSettings.get('ledring');
				if (account != null) {
					ledringPreference = account['ledring'];
				} else {
					console.log("Pushbullet - No account configured yet");
				}
			}
		});
	}

	authorize() {
		return authorize()
	}
}

module.exports = App;