const login = require( "facebook-chat-api" );

module.exports = ( app, users ) => {
    app.get( "/", ( req, res ) => {
        if ( req.session.uid )
        {
            const user = users.findOne( { userID: req.session.uid } );
            if ( !user )
                return res.render( "login" );

            const friends = [];
            if ( user.friends )
            {
                if ( !user.nicknames )
                    user.nicknames = {};

                for ( const friendID of user.friends )
                {
                    const friend = users.findOne( { userID: friendID } );
                    if ( !friend )
                        continue;

                    if ( !user.nicknames[friendID] )
                        user.nicknames[friendID] = friend.alternateName ? friend.alternateName : friend.firstName;

                    friends.push( { id: friend.userID, pic: friend.profilePicture, name: friend.fullName, nname: user.nicknames[friendID] } );
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

    app.post( "/login", ( req, res ) => {
        login( { email: req.body.email, password: req.body.password }, { forceLogin: true }, ( err, api ) => {
            if ( err )
            {
                if ( err.error === "login-approval" && req.body.code && req.body.code.length )
                    return err.continue( req.body.code );

                return res.send( err );
            }

            let userData;
            api.getUserInfo( req.session.uid = api.getCurrentUserID(), ( err, ret ) => {
                if ( !err )
                {
                    for ( const prop in ret )
                    {
                        if ( ret.hasOwnProperty( prop ) )
                        {
                            userData = ret[prop];

                            break;
                        }
                    }
                }

                api.getFriendsList( ( err, data ) => {
                    if ( err )
                        return res.send( err );

                    data.sort( ( a, b ) => {
                        return a.fullName.localeCompare( b.fullName );
                    } );

                    const friends = [];
                    for ( const user of data )
                    {
                        if ( parseInt( user.userID ) )
                        {
                            friends.push( user.userID );

                            const friend = users.findOne( { userID: user.userID } );
                            if ( friend )
                            {
                                friend.alternateName = user.alternateName;
                                friend.firstName = user.firstName;
                                friend.gender = user.gender;
                                friend.isFriend = user.isFriend;
                                friend.fullName = user.fullName;
                                friend.profilePicture = user.profilePicture;
                                friend.type = user.type;
                                friend.profileUrl = user.profileUrl;
                                friend.vanity = user.vanity;
                                friend.isBirthday = user.isBirthday;
                                users.update( friend );
                            }
                            else
                                users.insert( user );
                        }
                    }

                    const user = users.findOne( { userID: req.session.uid } );
                    if ( user )
                    {
                        if ( userData )
                        {
                            user.alternateName = userData.alternateName;
                            user.firstName = userData.firstName;
                            user.gender = userData.gender;
                            user.isFriend = userData.isFriend;
                            user.fullName = userData.name;
                            user.profilePicture = userData.thumbSrc;
                            user.type = userData.type;
                            user.profileUrl = userData.profileUrl;
                            user.vanity = userData.vanity;
                            user.isBirthday = userData.isBirthday;
                        }

                        user.cookies = api.getAppState();
                        user.friends = friends;
                        users.update( user );
                    }
                    else
                    {
                        userData.userID = req.session.uid;
                        userData.cookies = api.getAppState();
                        userData.friends = friends;
                        users.insert( userData );
                    }

                    res.end();
                } );
            } );
        } );
    } );

    app.post( "/logout", ( req, res ) => {
        req.session.uid = 0;

        res.end();
    } );
};