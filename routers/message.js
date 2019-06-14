const login = require( "facebook-chat-api" );
const seedrandom = require( "seedrandom" );
const util = require( "../util" );

module.exports = ( app, users ) => {
    app.post( "/setmessage", ( req, res ) => {
        if ( req.messageIDInvalid )
            return res.end();

        if ( !req.session.messages )
            req.session.messages = [ "" ];

        req.session.messages[req.messageID] = req.body.message;

        res.end();
    } );

    app.get( "/getmessage", ( req, res ) => {
        if ( !req.session.messages || !req.session.messages.length )
            req.session.messages = [ "" ];

        req.session.messages = req.session.messages.filter( ( value, index ) => {
            if ( value )
                return true;

            if ( req.session.variables && index < req.session.variables.length && Object.keys( req.session.variables[index] ).length )
                return true;

            if ( req.session.friends && index < req.session.friends.length && req.session.friends[index].length )
                return true;

            return false;
        } );

        if ( req.messageIDInvalid )
        {
            if ( req.session.messages.length )
                return res.send( { messages: req.session.messages } );
            else
            {
                req.messageID = 0;
                req.session.messages.push( "" );
            }
        }

        if ( req.query.id )
            res.send( { message: util.formatMessage( req.session.messages[req.messageID], util.getFriendVariables( req, users ), seedrandom.alea( req.query.seed ) ) } );
        else
            res.send( { message: req.session.messages[req.messageID] } );
    } );

    app.post( "/newmessage", ( req, res ) => {
        if ( !req.session.messages )
            req.session.messages = [];

        req.session.messages.push( "" );

        res.send( ( req.session.messages.length - 1 ).toString() );
    } );

    app.post( "/sendmessage", ( req, res ) => {
        if ( !req.session.uid )
            return res.end();

        if ( req.messageIDInvalid )
            return res.end();

        if ( !req.session.friends || !req.session.friends.length || !req.session.friends[req.messageID].length )
            return res.send( { error: "Please select at least one friend." } );

        const user = users.findOne( { userID: req.session.uid } );
        if ( !user )
            res.end();

        req.query.message_id = req.body.message_id; // Just because I'm too lazy to change getFriendVariables

        login( { appState: user.cookies }, ( err, api ) => {
            const sendMessages = ( current = 0 ) => {
                if ( current >= req.session.friends[req.messageID].length )
                {
                    req.session.messages.splice( req.messageID, 1 );
                    req.session.friends.splice( req.messageID, 1 );

                    if ( req.session.variables )
                        req.session.variables.splice( req.messageID, 1 );

                    if ( req.session.friendvariables )
                        req.session.friendvariables.splice( req.messageID, 1 );

                    return res.end();
                }

                const friend = req.session.friends[req.messageID][current];

                let rng;
                if ( friend in req.body.seeds )
                    rng = seedrandom.alea( req.body.seeds[friend] );
                else
                    rng = seedrandom.alea();

                req.query.id = friend.toString();
                api.sendMessage( util.formatMessage( req.session.messages[req.messageID], util.getFriendVariables( req, users ), rng ), friend, ( err ) => {
                    if ( err )
                        console.log( `Error when sending message to ${friend}: `, err );

                    sendMessages( current + 1 );
                } );
            };

            if ( err )
                return res.send( err );

            sendMessages();
        } );
    } );
};