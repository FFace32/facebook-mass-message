const login = require('ts-messenger-api').default;

module.exports = ( app, users ) => {
    app.get( "/", ( req, res ) => {
        if ( req.session.uid )
        {
            const user = users.findOne( { id: req.session.uid } );
            if ( !user )
                return res.render( "login" );

            const friends = [];
            if ( user.friends )
            {
                if ( !user.nicknames )
                    user.nicknames = {};

                for ( const friendID of user.friends )
                {
                    const friend = users.findOne( { id: friendID } );
                    if ( !friend )
                        continue;

                    if ( !user.nicknames[friendID] )
                        user.nicknames[friendID] = friend.alternateName ? friend.alternateName : friend.firstName;

                    friends.push( { id: friend.id, pic: friend.thumbSrc, name: friend.fullName, nname: user.nicknames[friendID] } );
                }

                users.update( user );
            }
            else
                return res.render( "login" );

            res.render( "index", { user: user, friends: friends } );
        }
        else
            res.render( "login" );
    } );

    app.post( "/login", async ( req, res ) => {
        let api;
        try
        {
            api = await login( { email: req.body.email, password: req.body.password }, { forceLogin: true } );
        }
        catch ( err )
        {
            const sendError = ( err ) => {
                if ( !err.error )
                    err.error = err.message;

                res.send( err );
            };

            // This is untested
            if ( err.error === "login-approval" && req.body.code && req.body.code.length )
            {
                try
                {
                    api = await err.continue( req.body.code );
                }
                catch ( err )
                {
                    return sendError( err );
                }
            }
            else
                return sendError( err );
        }

        let userData;
        try
        {
            const ret = await api.getUserInfo( [req.session.uid = api.ctx.userID] );

            for ( const prop in ret )
            {
                if ( ret.hasOwnProperty( prop ) )
                {
                    userData = ret[prop];

                    break;
                }
            }
        }
        catch ( err )
        {
            console.log( err );
        }

        try
        {
            const data = await api.getFriendsList();

            data.sort( ( a, b ) => {
                return a.fullName.localeCompare( b.fullName );
            } );

            const friends = [];
            for ( const user of data )
            {
                if ( parseInt( user.id ) )
                {
                    friends.push( user.id );

                    const friend = users.findOne( { id: user.id } );
                    if ( friend )
                    {
                        friend.alternateName = user.alternateName;
                        friend.firstName = user.firstName;
                        friend.gender = user.gender;
                        friend.isFriend = user.isFriend;
                        friend.fullName = user.fullName;
                        friend.thumbSrc = user.thumbSrc;
                        friend.type = user.type;
                        friend.profileUrl = user.profileUrl;
                        friend.vanity = user.vanity;
                        users.update( friend );
                    }
                    else
                        users.insert( user );
                }
            }

            const user = users.findOne( { id: req.session.uid } );
            if ( user )
            {
                if ( userData )
                {
                    user.alternateName = userData.alternateName;
                    user.firstName = userData.firstName;
                    user.gender = userData.gender;
                    user.isFriend = userData.isFriend;
                    user.fullName = userData.fullName;
                    user.thumbSrc = userData.thumbSrc;
                    user.type = userData.type;
                    user.profileUrl = userData.profileUrl;
                    user.vanity = userData.vanity;
                }

                user.cookies = api.getAppState();
                user.friends = friends;
                users.update( user );
            }
            else
            {
                userData.id = req.session.uid;
                userData.cookies = api.getAppState();
                userData.friends = friends;
                users.insert( userData );
            }

            res.end();
        }
        catch ( err )
        {
            res.send( err );
        }
    } );

    app.post( "/logout", ( req, res ) => {
        req.session.uid = 0;

        res.end();
    } );
};
