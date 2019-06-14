const request = require( "request" );
const express = require( "express" );
const session = require( "express-session" );
const LokiStore = require( "connect-loki" )( session );
const loki = require( "lokijs" );
const open = require( "open" );
const os = require( "os" );

const PORT = 4444;

console.log( "Checking for new version..." );
request( { url: "https://raw.githubusercontent.com/FFace32/facebook-mass-message/master/package.json", json: true }, ( error, response, body ) =>
{
    if ( !error && response.statusCode === 200 )
    {
        if ( require( "./package.json" ).version !== body.version )
            console.log( `Version ${body.version} available! See https://github.com/FFace32/facebook-mass-message` );
    }
    console.log();

    const app = express();
    app
        .use( express.static( "public" ) )
        .use( express.static( "favicon" ) )
        .use( require( "body-parser" ).urlencoded( { extended: true } ) )
        .use( session( { name: "f-m-m.sid", secret: "FuckFace", resave: false, saveUninitialized: false, store: new LokiStore(), cookie: { maxAge: 1000 * 60 * 60 * 24 * 14 } } ) )
        .set( "view engine", "ejs" );

    app.use( ( req, res, next ) => {
        if ( req.body.message_id )
            req.messageID = parseInt( req.body.message_id );
        else
            req.messageID = parseInt( req.query.message_id );

        if ( isNaN( req.messageID ) )
            req.messageID = -1;

        req.messageIDInvalid = req.messageID < 0 || !req.session.messages || req.messageID > req.session.messages.length;

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

        require( "./routers/login" )( app, users );
        require( "./routers/message" )( app, users );
        require( "./routers/variable" )( app );
        require( "./routers/friend" )( app, users );
    } );
} );