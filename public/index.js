var messageID = -1;

function get( url, data, success, dataType ) {
    if ( typeof data === "function" )
    {
        dataType = success;
        success = data;
        data = {};
    }

    data.message_id = messageID;
    $.get( url, data, success, dataType );
}

function post( url, data, success ) {
    data.message_id = messageID;
    $.post( url, data, success );
}

function updateMessagePreview() {
    var item = getSelectedItem();
    if ( item )
    {
        var data = item.children( ".circle-check" );
        get( "/getmessage", { id: data.data( "id" ), seed: data.data( "seed" ) }, function ( result ) {
            $( "#messagePreview" ).val( result.message );
        }, "json" );
    }
}

function addVariable( name, value, readonly, friendOnly ) {
    var variable = $( "#variable" ).html();
    var item;

    if ( !friendOnly )
    {
        item = $( variable );

        item.find( "#templateName" ).val( name ).removeAttr( "id" );
        item.find( "#templateValue" ).val( value ).on( "input", function () {
            post( "/setvariable", { name: name, value: $( this ).val() }, function () {
                updateMessagePreview();
            } );
        } ).removeAttr( "id" ).removeAttr( "placeholder" );
        item.find( "#removeVariable" ).on( "click", function () {
            $( this ).parent().parent().remove();

            $( "#friendVariableList li" ).each( function () {
                if ( $( this ).find( ".form-control" ).eq( 0 ).val() === name )
                {
                    $( this ).remove();

                    return false;
                }
            } );

            post( "/removevariable", { name: name }, function () {
                updateMessagePreview();
            } );
        } ).removeAttr( "id" );

        $( "#variableList" ).append( item );
    }

    var selecteditem = getSelectedItem();
    if ( !selecteditem )
        return;

    item = $( variable );
    item.find( "#templateName" ).val( name ).removeAttr( "id" );
    item.find( "#templateValue" ).val( friendOnly ? value : "" ).on( "input", function () {
        if ( name === "nname" )
        {
            selecteditem.find( ".nickname" ).text( $( this ).val() ).trigger( "input" );

            return;
        }

        post( "/setfriendvariable", { id: selecteditem.children( ".circle-check" ).data( "id" ), name: name, value: $( this ).val() }, function () {
            updateMessagePreview();
        } );
    } ).removeAttr( "id" ).removeAttr( readonly ? "placeholder" : "" ).prop( readonly ? "readonly" : "", true );
    item.find( "#removeVariable" ).remove();

    $( "#friendVariableList" ).append( item );
}

function setSelectAll( select ) {
    var button = $( "#friendListSelect" );
    var icon = button.children().eq( 0 );

    icon.removeClass( "fa-circle fa-check-circle" );
    if ( select )
    {
        icon.addClass( "fa-check-circle" );
        button.prop( "title", "Unselect all" );
    }
    else
    {
        icon.addClass( "fa-circle" );
        button.prop( "title", "Select all" );
    }
}

function getSelectedItem() {
    var item = $( ".friend.active" );
    if ( item.length )
        return item;

    return null;
}

function setSelectedItem( item ) {
    $( ".friend.active" ).toggleClass( "active" );
    item.toggleClass( "active" );

    updateMessagePreview();

    get( "/getfriendvariables", { id: item.children( ".circle-check" ).data( "id" ), all: $( "#showAll" ).is( ":checked" ) }, function ( result ) {
        $( "#friendVariableList li" ).remove();

        Object.keys( result ).forEach( function ( key ) {
            addVariable( key, result[key].value, result[key].readonly, true );
        } );
    }, "json" );
}

function load( message ) {
    $( "#message" ).val( message );

    get( "/getvariables", function ( result ) {
        Object.keys( result ).forEach( function ( key ) {
            addVariable( key, result[key] );
        } );

        $( ".friend" ).eq( 0 ).trigger( "click" );
    }, "json" );

    get( "/getfriends", function ( result ) {
        if ( !result.length )
            return;

        var friends = $( ".circle-check" );
        if ( result.length === friends.length )
            setSelectAll( true );

        friends.each( function () {
            if ( result.indexOf( $( this ).data( "id" ) ) > -1 )
                $( this ).children( "span" ).toggle();
        } );
    }, "json" );
}

$( function () {
    $( "#message" ).on( "input", function () {
        post( "/setmessage", { message: $( this ).val() }, function () {
            updateMessagePreview();
        } );
    } );

    $( "#variableForm" ).on( "submit", function ( event ) {
        event.preventDefault();

        var name = $( "#name" );
        var value = $( "#value" );

        post( "/setvariable", { name: name.val(), value: value.val(), check: true }, function ( result ) {
            if ( result.error )
            {
                var modal = $( "#errorModal" );
                modal.find( ".modal-body" ).text( result.error );
                modal.modal();
            }
            else
            {
                addVariable( name.val(), value.val() );

                name.val( "" );
                value.val( "" );

                updateMessagePreview();
            }
        } );
    } );

    var friendList = $( "#friendList" );
    var listWidth = 0;
    $( window ).on( "resize", function () {
        listWidth = 0;
        friendList.css( "min-width", 0 );
    } );

    $( "#friendListSearch" ).on( "input", function () {
        if ( !listWidth )
            listWidth = friendList.width();
        if ( !$( this ).val().length )
            listWidth = 0;
        friendList.css( "min-width", listWidth );

        var first = false, last = null;

        var search = accent_fold( $.trim( $( this ).val() ) ).toLowerCase();
        $( "#friendList li" ).show().filter( function () {
            var ret = accent_fold( $( this ).text() ).toLowerCase().indexOf( search ) < 0;

            $( this ).removeClass( "first-visible-list-group-item last-visible-list-group-item" );
            if ( !ret )
            {
                if ( !first )
                {
                    first = true;
                    $( this ).addClass( "first-visible-list-group-item" );
                }

                last = $( this );
            }

            return ret;
        } ).hide();

        if ( last )
            last.addClass( "last-visible-list-group-item" );
    } );

    $( "#friendListSelect" ).on( "click", function () {
        var selectAll = $( this ).children().eq( 0 ).hasClass( "fa-circle" );
        var ids = [];

        $( ".circle-check span" ).each( function () {
            ids.push( $( this ).parent().data( "id" ) );

            if ( selectAll )
                $( this ).show();
            else
                $( this ).hide();
        } );

        setSelectAll( selectAll );

        post( "/setfriend", { ids: ids, checked: selectAll } );
    } );

    $( ".circle-check" ).on( "click", function () {
        var span = $( this ).children( "span" );
        span.toggle();

        var selectAll = true;
        $( ".circle-check span" ).each( function () {
            if ( $( this ).is( ":hidden" ) )
            {
                setSelectAll( false );
                selectAll = false;

                return false;
            }
        } );

        if ( selectAll )
            setSelectAll( true );

        post( "/setfriend", { id: $( this ).data( "id" ), checked: span.is( ":visible" ) } );
    } );

    $( ".nickname" ).on( "input", function () {
        var element = $( this );
        var item = element.parent().parent().parent();

        if ( !item.is( getSelectedItem() ) )
            setSelectedItem( item );

        post( "/setnickname", { id: item.children( ".circle-check" ).data( "id" ), nickname: element.text() }, function ( result ) {
            if ( result && result.length )
                element.text( result );

            $( "#friendVariableList" ).children().eq( 0 ).find( ".form-control" ).eq( 1 ).val( element.text() );

            updateMessagePreview();
        } );
    } );

    $( ".friend" ).on( "click", function () {
        if ( $( this ).is( getSelectedItem() ) )
            return;

        setSelectedItem( $( this ) );
    } );

    $( "#regenerate" ).on( "click", function () {
        var item = getSelectedItem();
        if ( !item )
            return;

        item.children( ".circle-check" ).data( "seed", Math.floor( Math.random() * 999999 ) );

        updateMessagePreview();
    } );

    $( "#showAll" ).on( "change", function () {
        var item = getSelectedItem();
        if ( item )
            setSelectedItem( item );
    } );

    $( "#send" ).on( "click", function () {
        $( this ).prop( "disabled", true );

        var seeds = {};
        $( ".circle-check" ).each( function () {
            seeds[$( this ).data( "id" )] = $( this ).data( "seed" );
        } );

        post( "/sendmessage", { seeds: seeds }, function ( result ) {
            if ( result.error )
            {
                var modal = $( "#errorModal" );
                modal.find( ".modal-body" ).text( result.error ).append( "<br><br>Logging in and out might fix the issue." );
                modal.modal();
            }
            else
                location.href = "/";
        } );
    } );

    $( "#logout" ).on( "click", function () {
        post( "/logout", function () {
            location.href = "/";
        } );
    } );

    get( "/getmessage", function ( result ) {
        if ( result.messages )
        {
            var modal = $( "#messagesModal" );
            for ( var i = 0; i < result.messages.length; ++i )
            {
                var message = $( $( "#messageTemplate" ).html() );
                message.on( "click", function () {
                    $( "#messages li" ).removeClass( "active" );
                    $( this ).toggleClass( "active" );
                    $( "#ok" ).removeAttr( "disabled" );
                } );
                message.children().eq( 0 ).val( result.messages[i] );

                $( "#messages" ).append( message );
            }
            modal.modal( { backdrop: "static", keyboard: false } );

            $( "#ok" ).on( "click", function () {
                messageID = 0;
                $( "#messages li" ).each( function () {
                    if ( !$( this ).hasClass( "active" ) )
                        ++messageID;
                    else
                        return false;
                } );

                load( result.messages[messageID] );
                modal.modal( "hide" );
            } );

            $( "#new" ).on( "click", function () {
                post( "/newmessage", function ( result ) {
                    messageID = parseInt( result );
                    load( "" );

                    modal.modal( "hide" );
                } );
            } );
        }
        else
        {
            messageID = 0;
            load( result.message );
        }
    }, "json" );

    // Is there a way I can do this better?
    new ResizeSensor( $( "#userData" ), function () {
        var height = Math.max( $( "#userData" ).height(), 270 );

        friendList.css( "max-height", Math.max( height - 103, 0 ) );
    } );
} );