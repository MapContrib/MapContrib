

define([

    'backbone',
],
function (

    Backbone
) {

    'use strict';

    return Backbone.Model.extend({

        defaults: {

            'label': '',
            'href': '#',
            'callback': undefined,
        },
    });
});
