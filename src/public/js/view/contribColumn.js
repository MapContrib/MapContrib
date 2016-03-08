

define([

    'underscore',
    'backbone',
    'marionette',
    'bootstrap',
    'templates',
    'leaflet',
    'osm-auth',
    'helper/osmEdit',
    'ui/map',
    'const',
    'settings',
    'model/poiLayer',
    'ui/form/contribNodeTags/list',
    'ui/form/navPillsStacked/list'
],
function (

    _,
    Backbone,
    Marionette,
    Bootstrap,
    templates,
    L,
    osmAuth,
    OsmEditHelper,
    MapUi,
    CONST,
    settings,
    PoiLayerModel,
    ContribNodeTagsList,
    NavPillsStackedList
) {

    'use strict';

    return Marionette.LayoutView.extend({

        template: JST['contribColumn.html'],

        behaviors: {

            'l20n': {},
            'column': {},
        },

        regions: {

            'presetsNav': '.rg_presets_nav',
            'nav': '.rg_nav',
        },

        ui: {

            'column': '#contrib_column',
        },

        initialize: function () {

            var self = this;

            this._radio = Backbone.Wreqr.radio.channel('global');
        },

        setModel: function (model) {

            this.model = model;

            this.render();
        },

        _buildNewMarker: function () {

            var pos = new L.LatLng(
                this.model.get('lat'),
                this.model.get('lng')
            ),
            icon = MapUi.buildPoiLayerIcon(
                new PoiLayerModel({
                    'markerShape': settings.newPoiMarkerShape,
                    'markerIconType': CONST.map.markerIconType.library,
                    'markerIcon': settings.newPoiMarkerIcon,
                    'markerColor': settings.newPoiMarkerColor
                })
            );

            return L.marker(pos, {

                'icon': icon
            });
        },

        onBeforeOpen: function () {

            this._radio.vent.trigger('column:closeAll');
            this._radio.vent.trigger('widget:closeAll');
        },

        open: function () {

            this.triggerMethod('open');
        },

        onAfterOpen: function () {

            this._tempMarker = this._buildNewMarker();
            this._radio.reqres.request('map').addLayer(this._tempMarker);
        },

        close: function () {

            this.triggerMethod('close');
        },

        onBeforeClose: function () {

            if (this._tempMarker) {

                this._radio.reqres.request('map').removeLayer(this._tempMarker);
            }
        },

        onRender: function () {

            var items = [],
            presetModels = this._radio.reqres.request('presets').models;

            for (var key in presetModels) {
                if (presetModels.hasOwnProperty(key)) {
                    items.push({
                        'label': presetModels[key].get('name')
                    });
                }
            }

            this._presetsNav = new NavPillsStackedList();
            this._presetsNav.setItems(items);
            this.getRegion('presetsNav').show( this._presetsNav );

            this._presetsNav = new NavPillsStackedList();
            this._presetsNav.setItems([{
                'label': document.l10n.getSync('contribColumn_freeAddition')
            }]);
            this.getRegion('nav').show( this._presetsNav );
        },
    });
});
