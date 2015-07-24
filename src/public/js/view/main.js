

define([

	'underscore',
	'backbone',
	'marionette',
	'bootstrap',
	'templates',
	'settings',
	'const',
	'leaflet',
	'leaflet-layer-overpass',
	'markdown',

	'view/mainTitle',
	'view/loginModal',
	'view/poiColumn',
	'view/userColumn',
	'view/linkColumn',
	'view/contribColumn',
	'view/editSettingColumn',
	'view/editPoiColumn',
	'view/editPoiLayerColumn',
	'view/editPoiMarkerModal',
	'view/editTileColumn',
	'view/editPoiDataColumn',
	'view/zoomIndicatorNotification',

	'model/profile',
	'model/poiLayer',

	'collection/poiLayer',
],
function (

	_,
	Backbone,
	Marionette,
	Bootstrap,
	templates,
	settings,
	CONST,
	L,
	overpasseLayer,
	markdown,

	MainTitleView,
	LoginModalView,
	PoiColumnView,
	UserColumnView,
	LinkColumnView,
	ContribColumnView,
	EditSettingColumnView,
	EditPoiColumnView,
	EditPoiLayerColumnView,
	EditPoiMarkerModalView,
	EditTileColumnView,
	EditPoiDataColumnView,
	ZoomIndicatorNotificationView,

	ProfileModel,
	PoiLayerModel,

	PoiLayerCollection
) {

	'use strict';

	return Marionette.LayoutView.extend({

		template: JST['main.html'],

		behaviors: {

			'l20n': {},
		},

		ui: {

			'map': '#main_map',
			'zoomLevel': '#zoom_indicator .zoom',
			'zoomData': '#zoom_indicator .data',
			'toolbarButtons': '.toolbar .toolbar_btn',

			'controlToolbar': '#control_toolbar',
			'zoomInButton': '#control_toolbar .zoom_in_btn',
			'zoomOutButton': '#control_toolbar .zoom_out_btn',
			'locateButton': '#control_toolbar .locate_btn',
			'locateWaitButton': '#control_toolbar .locate_wait_btn',
			'expandScreenButton': '#control_toolbar .expand_screen_btn',
			'compressScreenButton': '#control_toolbar .compress_screen_btn',
			'controlPoiButton': '#control_toolbar .poi_btn',
			'controlTileButton': '#control_toolbar .tile_btn',

			'userToolbar': '#user_toolbar',
			'loginButton': '#user_toolbar .login_btn',
			'userButton': '#user_toolbar .user_btn',
			'linkButton': '#user_toolbar .link_btn',
			'contribButton': '#user_toolbar .contrib_btn',
			'editButton': '#user_toolbar .edit_btn',

			'helpToolbar': '#help_toolbar',
			'helpButton': '#help_toolbar .help_btn',
			'help': '#help',
			'helpCloseButton': '#help .close_btn',

			'editToolbar': '#edit_toolbar',
			'editSettingButton': '#edit_toolbar .setting_btn',
			'editPoiButton': '#edit_toolbar .poi_btn',
			'editTileButton': '#edit_toolbar .tile_btn',
		},

		regions: {

			'mainTitle': '#rg_main_title',

			'loginModal': '#rg_login_modal',

			'poiColumn': '#rg_poi_column',
			'userColumn': '#rg_user_column',
			'linkColumn': '#rg_link_column',
			'contribColumn': '#rg_contrib_column',
			'editSettingColumn': '#rg_edit_setting_column',
			'editPoiColumn': '#rg_edit_poi_column',
			'editPoiLayerColumn': '#rg_edit_poi_layer_column',
			'editPoiMarkerModal': '#rg_edit_poi_marker_modal',
			'editTileColumn': '#rg_edit_tile_column',
			'editPoiDataColumn': '#rg_edit_poi_data_column',

			'zoomIndicatorNotification': '#rg_zoom_indicator_notification',
		},

		events: {

			'click @ui.zoomInButton': 'onClickZoomIn',
			'click @ui.zoomOutButton': 'onClickZoomOut',
			'click @ui.locateButton': 'onClickLocate',
			'click @ui.locateWaitButton': 'onClickLocateWait',
			'click @ui.expandScreenButton': 'onClickExpandScreen',
			'click @ui.compressScreenButton': 'onClickCompressScreen',
			'click @ui.controlPoiButton': 'onClickPoi',

			'click @ui.helpButton': 'onClickHelp',
			'click @ui.helpCloseButton': 'onClickHelpClose',

			'click @ui.loginButton': 'onClickLogin',
			'click @ui.userButton': 'onClickUser',
			'click @ui.linkButton': 'onClickLink',
			'click @ui.contribButton': 'onClickContrib',
			'click @ui.editButton': 'onClickEdit',
			'click @ui.editSettingButton': 'onClickEditSetting',
			'click @ui.editPoiButton': 'onClickEditPoi',
			'click @ui.editTileButton': 'onClickEditTile',
		},

		initialize: function () {

			var self = this;

			this._seenZoomIndicatorNotification = false;
			this._minDataZoom = 0;

			this._radio = Backbone.Wreqr.radio.channel('global');

			this.model = new ProfileModel({

				'_id': '5249c43c6e789470197b5973',
			});

			this.model.fetch({

				'async': false,
				'error': function () {

					// FIXME
					console.error('nok');
				},
			});


			this._poiLayers = new PoiLayerCollection(null, { 'profileId': '5249c43c6e789470197b5973' });

			this._poiLayers.fetch({

				'success': function () {

					self.onLoadPoiLayers();
				},
				'error': function () {

					// FIXME
					console.error('nok');
				},
			});

			this._radio.reqres.setHandlers({

				'poiLayers': function (layerId) {

					return self._poiLayers;
				},
				'poiLayerHtmlIcon': function (poiLayerModel) {

					return self.getPoiLayerHtmlIcon( poiLayerModel );
				},
			});

			this._radio.commands.setHandlers({

				'column:showPoiLayer': function (poiLayerModel) {

					self.onCommandShowPoiLayer( poiLayerModel );
				},
				'modal:showEditPoiMarker': function (poiLayerModel) {

					self.onCommandShowEditPoiMarker( poiLayerModel );
				},
				'map:showPoiLayer': function (poiLayerModel) {

					self.showPoiLayer( poiLayerModel );
				},
				'map:hidePoiLayer': function (poiLayerModel) {

					self.hidePoiLayer( poiLayerModel );
				},
				'map:updatePoiLayerIcons': function (poiLayerModel) {

					self.updatePoiLayerIcons( poiLayerModel );
				},
				'map:updatePoiLayerPopups': function (poiLayerModel) {

					self.updatePoiLayerPopups( poiLayerModel );
				},
				'map:updatePoiPopup': function (poiLayerModel, node) {

					self.updatePoiPopup( poiLayerModel, node );
				},
				'editPoiData': function (dataFromOSM, poiLayerModel) {

					self.onCommandEditPoiData( dataFromOSM, poiLayerModel );
				},
			});


			this._radio.vent.on('session:unlogged', function (){

				self.renderUserButtonNotLogged();
				self.hideEditTools();
			});
		},

		onRender: function () {

			var self = this;


			if ( this._radio.reqres.request('var', 'isLogged') ) {

				this.renderUserButtonLogged();
				this.showEditTools();

				if ( $(window).width() >= settings.largeScreenMinWidth && $(window).height() >= settings.largeScreenMinHeight ) {

					this.ui.editToolbar.toggleClass('open');
				}
			}
			else {

				this.renderUserButtonNotLogged();
				this.hideEditTools();
			}


			this._poiColumnView = new PoiColumnView();
			this._userColumnView = new UserColumnView();
			this._linkColumnView = new LinkColumnView({ 'model': this.model });
			this._contribColumnView = new ContribColumnView({ 'model': this.model });
			this._editSettingColumnView = new EditSettingColumnView({ 'model': this.model });
			this._editPoiColumnView = new EditPoiColumnView({ 'model': this.model });
			this._editTileColumnView = new EditTileColumnView({ 'model': this.model });

			this._zoomIndicatorNotificationView = new ZoomIndicatorNotificationView();


			this.getRegion('mainTitle').show( new MainTitleView({ 'model': this.model }) );

			this.getRegion('poiColumn').show( this._poiColumnView );
			this.getRegion('userColumn').show( this._userColumnView );
			this.getRegion('linkColumn').show( this._linkColumnView );
			this.getRegion('contribColumn').show( this._contribColumnView );
			this.getRegion('editSettingColumn').show( this._editSettingColumnView );
			this.getRegion('editPoiColumn').show( this._editPoiColumnView );
			this.getRegion('editTileColumn').show( this._editTileColumnView );

			this.getRegion('zoomIndicatorNotification').show( this._zoomIndicatorNotificationView );



			if ( !document.fullscreenEnabled) {

				this.ui.expandScreenButton.addClass('hide');
				this.ui.compressScreenButton.addClass('hide');
			}

			$(window).on('fullscreenchange', function () {

				if ( document.fullscreenElement ) {

					self.onExpandScreen();
				}
				else {

					self.onCompressScreen();
				}
			});
		},

		onShow: function () {

			var self = this,
			center = this.model.get('center'),
			zoomLevel = this.model.get('zoomLevel');


			this.ui.toolbarButtons.tooltip({

				'container': 'body',
				'delay': {

					'show': CONST.tooltip.showDelay,
					'hide': CONST.tooltip.hideDelay
				}
			})
			.on('click', function () {

				$(this)
				.blur()
				.tooltip('hide');
			});


			this._map = L.map(this.ui.map[0], { 'zoomControl': false });

			this._radio.reqres.removeHandler('map');
			this._radio.reqres.setHandler('map', function () {

				return self._map;
			});

			this._map
			.setView([center.lat, center.lng], zoomLevel)
			.on('zoomend', function (e) {

				self.onZoomEnd(e);
			})
			.on('zoomlevelschange', function (e) {

				self.onZoomLevelsChange(e);
			})
			.on('locationfound', function () {

				self.onLocationFound();
			})
			.on('locationerror', function () {

				self.onLocationError();
			});

			this.updateZoomIndicator();

			L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {

				'attribution': '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
			})
			.addTo(this._map);
		},

		onLoadPoiLayers: function () {

			var self = this;

			this._mapLayers = {};

			_.each(this._poiLayers.models, function (poiLayerModel) {

				this.addPoiLayer( poiLayerModel );

			}, this);

			this.updateZoomDataIndicator();

			this._poiLayers.on('add', function (model) {

				this.addPoiLayer(model);
			}, this);

			this._poiLayers.on('destroy', function (model) {

				this.removePoiLayer(model);
			}, this);
		},

		addPoiLayer: function (poiLayerModel) {

			var self = this,
			layerGroup = L.layerGroup();

			layerGroup._poiIds = [];

			layerGroup.addLayer(

				new L.OverPassLayer({

					'endpoint': settings.overpassServer,
					'minzoom': poiLayerModel.get('minZoom'),
					'query': poiLayerModel.get('overpassRequest'),
					'callback': function(data) {

						var wayBodyNodes = {},
						icon = self.getPoiLayerIcon(poiLayerModel);


						data.elements.forEach(function (e) {

							if ( e.tags ) {

								return;
							}

							wayBodyNodes[e.id] = e;
						});


						data.elements.forEach(function (e) {

							if( !e.tags ) {

								return;
							}

							if ( layerGroup._poiIds.indexOf(e.id) > -1 ) {

								return;
							}

							layerGroup._poiIds.push(e.id);


							var pos;

							if(e.type === 'node') {

								pos = new L.LatLng(e.lat, e.lon);
							}
							else {

								pos = new L.LatLng(e.center.lat, e.center.lon);

								if ( e.nodes ) {

									var nodePositions = [];

									e.nodes.forEach(function (node) {

										if ( wayBodyNodes[node] ) {

											nodePositions.push(

												L.latLng(

													wayBodyNodes[node].lat,
													wayBodyNodes[node].lon
												)
											);
										}
									});

									var polygon = L.polygon( nodePositions, CONST.map.wayPolygonOptions );

									layerGroup.addLayer( polygon );
								}
							}


							var popupContent = self.getPoiLayerPopupContent(poiLayerModel, e),
							marker = L.marker(pos, {

								'icon': icon
							});

							marker._dataFromOSM = e;

							if ( popupContent ) {

								marker.bindPopup(

									L.popup({

										'autoPanPaddingTopLeft': L.point( CONST.map.panPadding.left, CONST.map.panPadding.top ),
										'autoPanPaddingBottomRight': L.point( CONST.map.panPadding.right, CONST.map.panPadding.bottom ),
									})
									.setContent( popupContent )
								);
							}

							layerGroup.addLayer( marker );
						});
					}
				})
			);

			this._mapLayers[ poiLayerModel.cid ] = layerGroup;

			this.showPoiLayer( poiLayerModel );
		},

		removePoiLayer: function (poiLayerModel) {

			this.hidePoiLayer( poiLayerModel );

			delete( this._mapLayers[ poiLayerModel.cid ] );
		},

		showPoiLayer: function (poiLayerModel) {

			this._map.addLayer( this._mapLayers[ poiLayerModel.cid ] );
		},

		hidePoiLayer: function (poiLayerModel) {

			this._map.removeLayer( this._mapLayers[ poiLayerModel.cid ] );
		},

		updatePoiLayerIcons: function (poiLayerModel) {

			var self = this;

			this._mapLayers[ poiLayerModel.cid ].eachLayer(function (layer) {

				if ( layer._icon ) {

					layer.setIcon( self.getPoiLayerIcon( poiLayerModel ) );
				}
			});
		},

		getPoiLayerIcon: function (poiLayerModel) {

			var iconOptions = _.extend({}, CONST.map.markers[ poiLayerModel.get('markerShape') ]),
			markerIcon = poiLayerModel.get('markerIcon'),
			markerColor = poiLayerModel.get('markerColor');

			iconOptions.className += ' '+ markerColor;

			if ( markerIcon ) {

				iconOptions.html += '<i class="fa fa-'+ markerIcon +' fa-fw"></i>';
			}

			return L.divIcon( iconOptions );
		},

		getPoiLayerHtmlIcon: function (poiLayerModel) {

			var html = '',
			iconOptions = _.extend({}, CONST.map.markers[ poiLayerModel.get('markerShape') ]),
			markerIcon = poiLayerModel.get('markerIcon'),
			markerColor = poiLayerModel.get('markerColor');

			html += '<div class="marker marker-1 '+ markerColor +'">';
			html += iconOptions.html;

			if ( markerIcon ) {

				html += '<i class="fa fa-'+ markerIcon +' fa-fw"></i>';
			}

			html += '</div>';

			return html;
		},

		updatePoiLayerPopups: function (poiLayerModel) {

			var popup,
			popupContent,
			self = this;

			this._mapLayers[ poiLayerModel.cid ].eachLayer(function (layer) {

				if ( layer._dataFromOSM ) {

					popup = layer.getPopup();
					popupContent = self.getPoiLayerPopupContent( poiLayerModel, layer._dataFromOSM );

					if ( popupContent ) {

						if ( popup ) {

							popup.setPopupContent( popupContent );
						}
						else {

							layer.bindPopup(

								L.popup({

									'autoPanPaddingTopLeft': L.point( CONST.map.panPadding.left, CONST.map.panPadding.top ),
									'autoPanPaddingBottomRight': L.point( CONST.map.panPadding.right, CONST.map.panPadding.bottom ),
								})
								.setContent( popupContent )
							);
						}
					}
					else {

						if ( popup ) {

							layer
							.closePopup()
							.unbindPopup();
						}
					}
				}
			});
		},

		updatePoiPopup: function (poiLayerModel, node) {

			var self = this;

			this._mapLayers[ poiLayerModel.cid ].eachLayer(function (layer) {

				if ( !layer._dataFromOSM || layer._dataFromOSM.id !== node.id ) {

					return;
				}

				layer._dataFromOSM = node;

				layer.setPopupContent( self.getPoiLayerPopupContent( poiLayerModel, layer._dataFromOSM ) );
			});
		},

		getPoiLayerPopupContent: function (poiLayerModel, dataFromOSM) {

			var re,
			self = this,
			globalWrapper = document.createElement('div'),
			editButtonWrapper = document.createElement('div'),
			editButton = document.createElement('button'),
			popupContent = markdown.toHTML( poiLayerModel.get('popupContent') );

			if ( !poiLayerModel.get('popupContent') ) {

				return '';
			}

			for (var k in dataFromOSM.tags) {

				re = new RegExp('{'+ k +'}', 'g');

				popupContent = popupContent.replace( re, dataFromOSM.tags[k] );
			}

			popupContent = popupContent.replace( /\{(.*?)\}/g, '' );

			editButton.className = 'btn btn-link';
			editButton.innerHTML = document.l10n.getSync('editTheseInformations');

			$(editButton).on('click', function () {

				self._radio.commands.execute('editPoiData', dataFromOSM, poiLayerModel);
			});

			editButtonWrapper.className = 'text-center prepend-xs-1 edit_poi_data';
			editButtonWrapper.appendChild( editButton );

			globalWrapper.innerHTML = popupContent;
			globalWrapper.appendChild( editButtonWrapper );

			return globalWrapper;
		},

		onCommandEditPoiData: function (dataFromOSM, poiLayerModel) {

			var view = new EditPoiDataColumnView({

				'dataFromOSM': dataFromOSM,
				'poiLayerModel': poiLayerModel,
			});

			this.getRegion('editPoiDataColumn').show( view );

			window.requestAnimationFrame(function () {

				view.open();
			});
		},

		renderUserButtonLogged: function () {

			var user = this._radio.reqres.request('model', 'user'),
			avatar = user.get('avatar'),
			letters = user.get('displayName')
			.toUpperCase()
			.split(' ')
			.splice(0, 3)
			.map(function (name) {

				return name[0];
			})
			.join('');

			if (letters.length > 3) {

				letters = letters[0];
			}


			if (avatar) {

				this.ui.userButton
				.addClass('avatar')
				.html('<img src="'+ avatar +'" alt="'+ letters +'">');
			}
			else {

				this.ui.userButton
				.removeClass('avatar')
				.html(letters);
			}

			this.ui.loginButton.addClass('hide');
			this.ui.userButton.removeClass('hide');
		},

		renderUserButtonNotLogged: function () {

			this.ui.loginButton.removeClass('hide');
			this.ui.userButton.addClass('hide');
		},

		showEditTools: function () {

			this.ui.editButton.removeClass('hide');
		},

		hideEditTools: function () {

			this.ui.editButton.addClass('hide');
			this.ui.editToolbar.removeClass('open');
		},



		onCommandShowPoiLayer: function (poiLayerModel) {

			var view;

			if ( poiLayerModel ) {

				view = new EditPoiLayerColumnView({

					'model': poiLayerModel
				});
			}
			else {

				view = new EditPoiLayerColumnView({

					'model': new PoiLayerModel({ 'profileId': this.model.get('_id') })
				});
			}

			this.getRegion('editPoiLayerColumn').show( view );

			window.requestAnimationFrame(function () {

				view.open();
			});
		},



		onCommandShowEditPoiMarker: function (poiLayerModel) {

			var view = new EditPoiMarkerModalView({

				'model': poiLayerModel
			});

			this.getRegion('editPoiMarkerModal').show( view );
		},



		onClickZoomIn: function () {

			this._map.zoomIn();
		},

		onClickZoomOut: function () {

			this._map.zoomOut();
		},

		onClickLocate: function () {

			this.ui.locateButton.addClass('hide');
			this.ui.locateWaitButton.removeClass('hide');

			this._map.locate({

				'setView': true,
				'enableHighAccuracy': true,
				'maximumAge': 60 * 1000, // 60 seconds
			});
		},

		onClickLocateWait: function () {

			this._map.stopLocate();
		},

		updateZoomDataIndicator: function () {

			var self = this,
			nbZoom = this._map.getMaxZoom() - this._map.getMinZoom(),
			minZoom = 100000;

			_.each(this._poiLayers.models, function (poiLayerModel) {

				if ( poiLayerModel.get('minZoom') < minZoom ) {

					minZoom = poiLayerModel.get('minZoom');
				}

			}, this);

			var left = Math.round( (100 / nbZoom) * minZoom );

			this._minDataZoom = minZoom;

			window.requestAnimationFrame(function () {

				self.ui.zoomData.css('left', left + '%');

				self.checkZoomIndicatorNotification();
			});
		},

		updateZoomIndicator: function () {

			var self = this,
			nbZoom = this._map.getMaxZoom() - this._map.getMinZoom(),
			step = Math.round( (100 / nbZoom) * this._map.getZoom() );

			if (step > 100) {

				step = 100;
			}

			window.requestAnimationFrame(function () {

				self.ui.zoomLevel.css('left', step + '%');

				self.checkZoomIndicatorNotification();
			});
		},

		onZoomEnd: function (e) {

			this.updateZoomIndicator();
		},

		onZoomLevelsChange: function (e) {

			this.updateZoomIndicator();
		},

		checkZoomIndicatorNotification: function () {

			if ( !this._seenZoomIndicatorNotification &&  this._map.getZoom() < this._minDataZoom ) {

				this._seenZoomIndicatorNotification = true;

				this._zoomIndicatorNotificationView.open();
			}
			else if ( this._map.getZoom() >= this._minDataZoom ) {

				this._zoomIndicatorNotificationView.close();
			}
		},

		onLocationFound: function () {

			this.ui.locateWaitButton.addClass('hide');
			this.ui.locateButton.removeClass('hide');
		},

		onLocationError: function () {

			this.ui.locateWaitButton.addClass('hide');
			this.ui.locateButton.removeClass('hide');

			// FIXME
			// Give some feedback to the user
		},

		onClickExpandScreen: function () {

			document.documentElement.requestFullscreen();
		},

		onClickCompressScreen: function () {

			document.exitFullscreen();
		},

		onExpandScreen: function () {

			this.ui.expandScreenButton.addClass('hide');
			this.ui.compressScreenButton.removeClass('hide');
		},

		onCompressScreen: function () {

			this.ui.compressScreenButton.addClass('hide');
			this.ui.expandScreenButton.removeClass('hide');
		},

		onClickPoi: function () {

			this._poiColumnView.open();
		},

		onClickHelp: function () {

			this.ui.help.addClass('open');
		},

		onClickHelpClose: function () {

			this.ui.help.removeClass('open');
		},

		onClickLogin: function () {

			var self = this;

			this._loginModalView = new LoginModalView();

			this.getRegion('loginModal').show( this._loginModalView );
		},

		onClickUser: function () {

			this._userColumnView.open();
		},

		onClickLink: function () {

			this._linkColumnView.open();
		},

		onClickContrib: function () {

			this._contribColumnView.open();
		},

		onClickEdit: function () {

			this.ui.editToolbar.toggleClass('open');
		},

		onClickEditSetting: function () {

			this._editSettingColumnView.open();
		},

		onClickEditPoi: function () {

			this._editPoiColumnView.open();
		},

		onClickEditTile: function () {

			this._editTileColumnView.open();
		},
	});
});
