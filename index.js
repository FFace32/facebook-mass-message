const express = require( "express" );
const session = require( "express-session" );
const LokiStore = require( "connect-loki" )( session );
const loki = require( "lokijs" );
const seedrandom = require( "seedrandom" );
const login = require( "facebook-chat-api" );
const open = require( "open" );
const os = require( "os" );

const PORT = 4444;

const app = express();
app
    .use( express.static( "public" ) )
    .use( express.static( "favicon" ) )
    .use( require( "body-parser" ).urlencoded( { extended: true } ) )
    .use( session( { name: "f-m-m.sid", secret: "FuckFace", resave: false, saveUninitialized: false, store: new LokiStore(), cookie: { maxAge: 1000 * 60 * 60 * 24 * 14 } } ) )
    .set( "view engine", "ejs" );

app.use( function ( req, res, next ) {
    if ( req.body.message_id )
        req.messageID = parseInt( req.body.message_id );
    else
        req.messageID = parseInt( req.query.message_id );

    if ( isNaN( req.messageID ) )
        req.messageID = -1;

    next();
} );

let users;
const db = new loki( "user-store.db", { env: "NODEJS", autosave: true, autosaveInterval: 5000 } );
db.loadDatabase( {}, () => {
    users = db.getCollection( "Users" );
    if ( !users )
        users = db.addCollection( "Users" );

    app.listen( PORT, () => {
        console.log( `Listening on http://localhost:${PORT}` );
        open( `http://localhost:${PORT}` );

        const addresses = [];
        const interfaces = os.networkInterfaces();
        for ( const name in interfaces )
        {
            if ( interfaces.hasOwnProperty( name ) )
            {
                for ( const current of interfaces[name] )
                {
                    if ( current.family === "IPv4" && current.internal === false )
                        addresses.push( current.address );
                }
            }
        }

        if ( addresses.length )
        {
            console.log( "\nOther possible addresses:" );
            for ( const address of addresses )
                console.log( `http://${address}:${PORT}` );
        }
    } );
} );

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

                data.sort( function ( a, b ) {
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

app.post( "/setmessage", ( req, res ) => {
    if ( messageIDIsInvalid( req ) )
        return res.end();

    if ( !req.session.messages )
        req.session.messages = [ "" ];

    req.session.messages[req.messageID] = req.body.message;

    res.end();
} );

app.get( "/getmessage", ( req, res ) => {
    if ( !req.session.messages || !req.session.messages.length )
        req.session.messages = [ "" ];

    req.session.messages = req.session.messages.filter( function ( value, index ) {
        if ( value )
            return true;

        if ( req.session.variables && index < req.session.variables.length && Object.keys( req.session.variables[index] ).length )
            return true;

        if ( req.session.friends && index < req.session.friends.length && req.session.friends[index].length )
            return true;

        return false;
    } );

    if ( messageIDIsInvalid( req ) )
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
        res.send( { message: formatMessage( req.session.messages[req.messageID], getFriendVariables( req ), seedrandom.alea( req.query.seed ) ) } );
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
    if ( !req.session.uid || !req.session.friends || !req.session.friends.length )
        return res.end();

    if ( messageIDIsInvalid( req ) )
        return res.end();

    const user = users.findOne( { userID: req.session.uid } );
    if ( !user )
        res.end();

    req.query.message_id = req.body.message_id; // Just because I'm too lazy to change getFriendVariables

    login( { appState: user.cookies }, ( err, api ) => {
        if ( err )
            return res.send( err );

        function sendMessages( current = 0 ) {
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
            api.sendMessage( formatMessage( req.session.messages[req.messageID], getFriendVariables( req ), rng ), friend, ( err, messageInfo ) => {
                if ( err )
                    console.log( "Error when sending message to " + friend + ": ", err );

                sendMessages( current + 1 );
            } );
        }

        sendMessages();
    } );
} );

app.post( "/setvariable", ( req, res ) => {
    if ( messageIDIsInvalid( req ) )
        return res.end();

    if ( !req.session.variables )
        req.session.variables = [];

    if ( !req.session.variables[req.messageID] )
        req.session.variables[req.messageID] = {};

    if ( req.body.check )
    {
        if ( req.body.name === "nname" || req.body.name in req.session.variables[req.messageID] || req.body.name in friendVariableMap )
            return res.send( { error: `Variable %${req.body.name}% already exists!` } );
    }

    req.session.variables[req.messageID][req.body.name] = req.body.value;

    res.end();
} );

app.post( "/removevariable", ( req, res ) => {
    if ( messageIDIsInvalid( req ) )
        return res.end();

    if ( req.session.variables && req.session.variables[req.messageID] )
        delete req.session.variables[req.messageID][req.body.name];

    res.end();
} );

app.get( "/getvariables", ( req, res ) => {
    if ( messageIDIsInvalid( req ) )
        return res.end();

    if ( req.session.variables && req.session.variables[req.messageID] )
        res.send( req.session.variables[req.messageID] );
    else
        res.send( "{}" );
} );

app.post( "/setfriend", ( req, res ) => {
    if ( messageIDIsInvalid( req ) )
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
    if ( messageIDIsInvalid( req ) )
        return res.end();

    if ( req.session.friends && req.session.friends[req.messageID] )
        res.send( req.session.friends[req.messageID] );
    else
        res.send( "[]" );
} );

app.post( "/setfriendvariable", ( req, res ) => {
    if ( messageIDIsInvalid( req ) )
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
    res.send( getFriendVariables( req, false ) );
} );

app.post( "/setnickname", ( req, res ) => {
    if ( !req.session.uid )
        return res.end();

    const user = users.findOne( { userID: req.session.uid } );
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
        const friend = users.findOne( { userID: req.body.id } );
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

function formatMessage( message, variables, rng, recursion = 0 ) {
    if ( recursion > 1000 )
        return "...";

    if ( !message )
        return "";

    let level = 0;
    let spintaxStart = 0, variableStart = 0;
    let options = [];
    let lastOption = 0;
    for ( let i = 0; i < message.length; ++i )
    {
        const escape = function () {
            let escapeCount = 0;
            for ( let j = i - 1; j >= 0; --j )
            {
                if ( message[j] === "\\" )
                    ++escapeCount;
                else
                    break;
            }

            if ( escapeCount )
                message = message.substr( 0, i - 1 ) + message.substr( i-- );

            return escapeCount % 2 === 0;
        };

        if ( message[i] === "{" )
        {
            if ( escape() )
            {
                ++level;
                if ( !spintaxStart )
                    lastOption = spintaxStart = i + 1;
            }
        }
        else if ( message[i] === "|" )
        {
            if ( level === 1 && escape() )
            {
                options.push( message.substr( lastOption, i - lastOption ) );
                lastOption = i + 1;
            }
        }
        else if ( message[i] === "}" )
        {
            if ( spintaxStart && escape() )
            {
                --level;
                if ( !level )
                {
                    options.push( message.substr( lastOption, i - lastOption ) );
                    const option = formatMessage( options[Math.floor( rng() * options.length )], variables, rng, ++recursion );

                    message = message.replace( message.substr( spintaxStart - 1, i - spintaxStart + 2 ), option );

                    i = spintaxStart + option.length - 2;
                    spintaxStart = 0;
                    options = [];
                }
            }
        }
        else if ( message[i] === "%" )
        {
            if ( !level && escape() )
            {
                if ( variableStart )
                {
                    const name = message.substr( variableStart, i - variableStart );
                    let value = "BAD_VARIABLE_NAME";
                    if ( name in variables )
                        value = formatMessage( variables[name].value, variables, rng, ++recursion );

                    message = message.replace( message.substr( variableStart - 1, i - variableStart + 2 ), value );

                    i = variableStart + value.length - 2;
                    variableStart = 0;
                }
                else
                    variableStart = i + 1;
            }
        }
    }

    return message;
}

const friendVariableMap = {
    aname: "alternateName",
    fname: "firstName",
    flname: "fullName",
    picture: "profilePicture",
    url: "profileUrl",
    vanity: "vanity"
};

function getFriendVariables( req, values = true ) {
    const friendvariables = {};
    if ( messageIDIsInvalid( req ) )
        return friendvariables;

    const all = req.query.all || "true";
    if ( req.session.uid )
    {
        const user = users.findOne( { userID: req.session.uid } );
        if ( user )
        {
            friendvariables.nname = { value: user.nicknames[req.query.id], readonly: false };

            if ( all === "true" && user.friends.includes( req.query.id ) )
            {
                const friend = users.findOne( { userID: req.query.id } );
                if ( friend )
                {
                    for ( const variable in friendVariableMap )
                    {
                        if ( friendVariableMap.hasOwnProperty( variable ) )
                            friendvariables[variable] = { value: friend[friendVariableMap[variable]], readonly: true };
                    }
                }
            }
        }
    }

    if ( req.session.variables )
    {
        for ( const variable in req.session.variables[req.messageID] )
        {
            if ( req.session.variables[req.messageID].hasOwnProperty( variable ) )
                friendvariables[variable] = { value: values ? req.session.variables[req.messageID][variable] : "", readonly: false };
        }
    }

    if ( req.session.friendvariables && req.session.friendvariables[req.messageID] && req.query.id in req.session.friendvariables[req.messageID] )
    {
        for ( const variable in req.session.friendvariables[req.messageID][req.query.id] )
        {
            if ( req.session.friendvariables[req.messageID][req.query.id].hasOwnProperty( variable ) )
            {
                if ( variable !== "nname" && !( variable in friendVariableMap ) && variable in friendvariables )
                {
                    if ( values && req.session.friendvariables[req.messageID][req.query.id][variable].length || !values )
                        friendvariables[variable] = { value: req.session.friendvariables[req.messageID][req.query.id][variable], readonly: false };
                }
                else
                    delete req.session.friendvariables[req.messageID][req.query.id][variable];
            }
        }
    }

    return friendvariables;
}

function messageIDIsInvalid( req ) {
    return req.messageID < 0 || !req.session.messages || req.messageID > req.session.messages.length;
}