module.exports = {
    formatMessage: ( message, variables, rng, recursion = 0 ) => {
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
            const escape = () => {
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
                        const option = module.exports.formatMessage( options[Math.floor( rng() * options.length )], variables, rng, ++recursion );

                        message = message.substr( 0, spintaxStart - 1 ) + option + message.substr( i + 1 );

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
                            value = module.exports.formatMessage( variables[name].value, variables, rng, ++recursion );

                        message = message.substr(0, variableStart - 1 ) + value + message.substr( i + 1 );

                        i = variableStart + value.length - 2;
                        variableStart = 0;
                    }
                    else
                        variableStart = i + 1;
                }
            }
        }

        return message;
    },

    friendVariableMap: {
        aname: "alternateName",
        fname: "firstName",
        flname: "fullName",
        picture: "profilePicture",
        url: "profileUrl",
        vanity: "vanity"
    },

    getFriendVariables: ( req, users, values = true ) => {
        const friendvariables = {};
        if ( req.messageIDInvalid )
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
                        for ( const variable in module.exports.friendVariableMap )
                        {
                            if ( module.exports.friendVariableMap.hasOwnProperty( variable ) )
                                friendvariables[variable] = { value: friend[module.exports.friendVariableMap[variable]], readonly: true };
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
                    if ( variable !== "nname" && !( variable in module.exports.friendVariableMap ) && variable in friendvariables )
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
};