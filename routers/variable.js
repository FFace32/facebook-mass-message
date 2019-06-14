const util = require( "../util" );

module.exports = ( app ) => {
    app.post( "/setvariable", ( req, res ) => {
        if ( req.messageIDInvalid )
            return res.end();

        if ( !req.session.variables )
            req.session.variables = [];

        if ( !req.session.variables[req.messageID] )
            req.session.variables[req.messageID] = {};

        if ( req.body.check )
        {
            if ( req.body.name === "nname" || req.body.name in req.session.variables[req.messageID] || req.body.name in util.friendVariableMap )
                return res.send( { error: `Variable %${req.body.name}% already exists!` } );
        }

        req.session.variables[req.messageID][req.body.name] = req.body.value;

        res.end();
    } );

    app.post( "/removevariable", ( req, res ) => {
        if ( req.messageIDInvalid )
            return res.end();

        if ( req.session.variables && req.session.variables[req.messageID] )
            delete req.session.variables[req.messageID][req.body.name];

        res.end();
    } );

    app.get( "/getvariables", ( req, res ) => {
        if ( req.messageIDInvalid )
            return res.end();

        if ( req.session.variables && req.session.variables[req.messageID] )
            res.send( req.session.variables[req.messageID] );
        else
            res.send( "{}" );
    } );
};