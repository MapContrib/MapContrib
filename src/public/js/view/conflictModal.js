

define([

    'underscore',
    'backbone',
    'backbone.marionette',
    '../../templates/templates',
],
function (

    _,
    Backbone,
    Marionette,
    templates
) {

    'use strict';

    return Marionette.LayoutView.extend({

        template: JST['conflictModal.html'],

        behaviors: {

            'l20n': {},
            'modal': {},
        },

        ui: {

            'modal': '#conflict_modal',
        },

        initialize: function () {

            var self = this;

            this._radio = Backbone.Wreqr.radio.channel('global');
        },

        close: function () {

            this.triggerMethod('close');
        },
    });
});
