module.exports = [
  {
    description:'Log in to Pushbullet',
    method:'POST',
    path: '/settings/authorize',
    fn: function( callback, args ){
        Homey.app.authorize( callback );
    }
  }
]
