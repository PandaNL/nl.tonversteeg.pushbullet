"use strict";

var https		= require('https');
var querystring = require('querystring');
var Pushbullet = require('pushbullet');

var account = [];
var user_info = [];
var devices = null;
var pushbulletToken;
var ledringPreference = false;

/*
	Flow cards
*/
Homey.manager('flow').on('action.pushbulletSend', function( callback, args ){
		if( typeof pushbulletToken == 'undefined' || pushbulletToken == '') return callback( new Error("Pushbullet not logged in under settings!") );
		var pMessage = args.message;
		var pDeviceParams = '';
		pushbulletSend ( pushbulletToken, pMessage);
    callback( null, true ); // we've fired successfully
});

Homey.manager('flow').on('action.pushbulletSend_device', function( callback, args ){
		if( typeof pushbulletToken == 'undefined' || pushbulletToken == '') return callback( new Error("Pushbullet not logged in under settings!") );
		var pMessage = args.message;
		var pDevice = args.device.iden;
		if( pDevice == null || pDevice == '') return callback( new Error("No devices registered on this Pushover account!") );
		pushbulletSend ( pushbulletToken, pMessage, pDevice);
    callback( null, true ); // we've fired successfully
});

Homey.manager('flow').on('action.pushbulletSend_device.device.autocomplete', function( callback, value ) {
	var deviceSearchString = value.query;
	var items = searchForDevicesByValue( deviceSearchString );
	callback( null, items );
});

/*
	Search device function for auto-complete in flow card.
*/
function searchForDevicesByValue ( value ) {
	var possibleDevices = devices;
	var tempItems = [];
	for (var i = 0; i < devices.length; i++) {
		var tempDevice = possibleDevices[i].nickname;
		var tempIden = possibleDevices[i].iden;
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
		var pusher = new Pushbullet(pToken)

		pusher.note(pDeviceParams, 'Homey', pMessage, function(error, response) {
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
	}
}

/*
	Set arrays
*/
function pushbulletBoot () {
	devices = null;
	devices = Homey.manager('settings').get('userdevices');
	user_info = null;
	user_info = Homey.manager('settings').get('userinfo');
	if (user_info != null){
		pushbulletToken = user_info.token;
	};
}

/*
	Get users devices
*/
function getDevices ( token) {
	var pusher = new Pushbullet(token)

	pusher.devices(function(err, response) {
		if( response != null){
			var tempDevices = response;
			devices = [];
			for (var i = 0; i < tempDevices.devices.length; i++){

				if(tempDevices.devices[i].active == true){
					devices.push({
						iden: tempDevices.devices[i].iden,
						nickname: tempDevices.devices[i].nickname,
						model: tempDevices.devices[i].model
					});
				};

			};
			Homey.manager('settings').set('userdevices', devices);
			Homey.log('Pushbullet - Devices saved');
		};
	});
}


/*
	Get user info and save in userinfo setting
*/
function getUserInfo ( token, callback) {
		var pusher = new Pushbullet(token)

		pusher.me(function(err, response) {
			Homey.manager('settings').set('userinfo', {
				name	: response.name,
				email : response.email,
				token : token
		});
			Homey.log('Pushbullet - Userinfo saved');
			callback(true);
		});
}


/*
	Authorize with Pushbullet using Oauth2
*/
function authorize ( callback) {

	callback = callback || function(){}

	var callback_called = false;

	Homey.manager('cloud').generateOAuth2Callback(
		'https://www.pushbullet.com/authorize?client_id=' + Homey.env.CLIENT_ID + '&redirect_uri=' + Homey.env.REDIRECT_URI + '&response_type=code',
		onGotUrl,
		onGotCode
	);

	function onGotUrl( err, url ){
		if( err ) return callback(err);
		Homey.log('Pushbullet - Got url!');
		callback( null, url );
		callback_called = true;
	}

	function onGotCode( err, code ) {
		if( err ) {
		    Homey.manager('api').realtime('authorized', false);
			return Homey.error(err);
		}

		Homey.log('Pushbullet - Got authorization code!');

		var data = querystring.stringify({
					'client_id'		: Homey.env.CLIENT_ID,
	        'client_secret'	: Homey.env.CLIENT_SECRET,
	        'code'			: code,
					'grant_type'	: 'authorization_code'
		});

		var options = {
			host: 'api.pushbullet.com',
			path: '/oauth2/token',
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(data)
			}
		};

		var req = https.request(options, function(res) {
			res.setEncoding('utf8');
			var body = "";
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

				    Homey.manager('settings').set('auth', {
					    access_token	: body.access_token
					});

						pushbulletToken = body.access_token;

						Homey.manager('api').realtime('authorized', true);

						getUserInfo(pushbulletToken, function (err, data) {
							if (data = true) {
								getDevices(pushbulletToken);
							}
						});

					} catch(e){
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
var self = module.exports = {
	init: function () {

		Homey.log('Pushbullet - app ready');
		pushbulletBoot();

		Homey.manager('settings').on( 'set', function(settingname){

			if(settingname == 'ledring') {
			Homey.log('Pushbullet - Ledring preference has been changed...');
			account = Homey.manager('settings').get('ledring');
			if (account != null) {
				ledringPreference = account['ledring'];
			} else {
			Homey.log("Pushbullet - No account configured yet");
			}
		}
		});

	},

	authorize: authorize
}
