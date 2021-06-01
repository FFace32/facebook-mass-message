const util = require( "../util" );

module.exports = ( app, users ) => {
    app.post( "/setfriend", ( req, res ) => {
        if ( req.messageIDInvalid )
            return res.end();

        if ( !req.session.friends )
            req.session.friends = [];

        if ( !req.session.friends[req.messageID] )
            req.session.friends[req.messageID] = [];

        if ( !req.body.ids )
            req.body.ids = [ req.body.id ];

        for ( const bid of req.body.ids )
        {
            const id = parseInt( bid );
            if ( id )
            {
                const find = req.session.friends[req.messageID].indexOf( id );
                if ( find > -1 )
                {
                    if ( req.body.checked === "false" )
                        req.session.friends[req.messageID].splice( find, 1 );
                }
                else if ( req.body.checked === "true" )
                    req.session.friends[req.messageID].push( id );
            }
        }

        res.end();
    } );

    app.get( "/getfriends", ( req, res ) => {
        if ( req.messageIDInvalid )
            return res.end();

        if ( req.session.friends && req.session.friends[req.messageID] )
            res.send( req.session.friends[req.messageID] );
        else
            res.send( "[]" );
    } );

    app.post( "/setfriendvariable", ( req, res ) => {
        if ( req.messageIDInvalid )
            return res.end();

        if ( !req.session.friendvariables )
            req.session.friendvariables = [];

        if ( !req.session.friendvariables[req.messageID] )
            req.session.friendvariables[req.messageID] = {};

        if ( !req.session.friendvariables[req.messageID][req.body.id] )
            req.session.friendvariables[req.messageID][req.body.id] = {};

        req.session.friendvariables[req.messageID][req.body.id][req.body.name] = req.body.value;

        res.end();
    } );

    app.get( "/getfriendvariables", ( req, res ) => {
        res.send( util.getFriendVariables( req, users, false ) );
    } );

    app.post( "/setnickname", ( req, res ) => {
        if ( !req.session.uid )
            return res.end();

        const user = users.findOne( { id: req.session.uid } );
        if ( !user )
            return res.end();

        if ( !user.friends.includes( req.body.id ) )
            return res.end();

        if ( req.body.nickname )
        {
            if ( !user.nicknames )
                user.nicknames = {};

            user.nicknames[req.body.id] = req.body.nickname;
        }
        else
        {
            const friend = users.findOne( { id: req.body.id } );
            if ( friend )
            {
                if ( !user.nicknames )
                    user.nicknames = {};

                user.nicknames[req.body.id] = friend.alternateName ? friend.alternateName : friend.firstName;

                return res.send( user.nicknames[req.body.id] );
            }
        }

        res.end();
    } );
};
