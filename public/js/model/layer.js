import Backbone from 'backbone';
import 'backbone-relational';
import Wreqr from 'backbone.wreqr';
import CONST from '../const';
import { uuid } from '../core/utils';

export default Backbone.RelationalModel.extend({
  defaults() {
    return {
      creationDate: new Date().toISOString(),
      modificationDate: new Date().toISOString(),
      uuid: undefined,
      type: CONST.layerType.overpass,
      name: undefined,
      description: undefined,
      visible: true,
      minZoom: 14,
      popupContent: undefined,
      order: undefined,

      // Point based layer specific
      rootLayerType: CONST.rootLayerType.markerCluster,
      markerShape: 'marker2',
      markerColor: 'green',
      markerIconType: CONST.map.markerIconType.library,
      markerIcon: undefined,
      markerIconUrl: undefined,
      heatMinOpacity: 0.05,
      heatMaxZoom: 18,
      heatMax: 1.0,
      heatBlur: 15,
      heatRadius: 25,

      // Shape files based layer specific
      fileUri: undefined,

      // Overpass type specific
      overpassRequest: undefined,
      cache: false,
      cacheUpdateSuccess: undefined,
      cacheUpdateSuccessDate: undefined,
      cacheUpdateDate: undefined,
      cacheUpdateError: undefined,
      cacheBounds: undefined,
      cacheArchive: false,

      locales: {
        /*
                fr: {
                    name: '',
                    description: '',
                }
            */
      }
    };
  },

  localizedAttributes: ['name', 'description', 'popupContent'],

  // GeoJSON objects displayed on the map
  _geoJsonObjects: {},

  _isArchivedFeaturesFetched: false,
  _isDeletedFeaturesFetched: false,
  _isModifiedFeaturesFetched: false,
  _archivedFeatures: [],
  _deletedFeatures: [],
  _modifiedFeatures: [],

  initialize() {
    this._radio = Wreqr.radio.channel('global');

    if (!this.get('uuid')) {
      this.set('uuid', uuid());
    }

    if (Array.isArray(this.get('locales'))) {
      this.set('locales', {});
    }
  },

  updateModificationDate() {
    this.set('modificationDate', new Date().toISOString());
  },

  /**
   * Tells if the layer is visible.
   *
   * @author Guillaume AMAT
   * @return boolean
   */
  isVisible() {
    const isOwner = this._radio.reqres.request('user:isOwner');

    if (isOwner) {
      return true;
    }

    return this.get('visible');
  },

  /**
   * Merges the objects with the current displayed GeoJSON objects.
   *
   * @author Guillaume AMAT
   * @param {object} objects - GeoJSON objects
   */
  addObjects(objects) {
    this._geoJsonObjects = {
      ...this._geoJsonObjects,
      ...objects
    };
  },

  getObjects() {
    return this._geoJsonObjects;
  },

  async getModifiedFeatures(fragment) {
    if (this._isModifiedFeaturesFetched) {
      return this._modifiedFeatures;
    }

    const archiveFileUrl = `/files/theme/${fragment}/overPassCache/${this.get(
      'uuid'
    )}-modified.json`;

    this._isModifiedFeaturesFetched = true;
    this._modifiedFeatures = await fetch(archiveFileUrl)
      .then(res => res.json())
      .catch(() => []);

    return this._modifiedFeatures;
  },

  async getDeletedFeatures(fragment) {
    if (this._isDeletedFeaturesFetched) {
      return this._deletedFeatures;
    }

    const archiveFileUrl = `/files/theme/${fragment}/overPassCache/${this.get(
      'uuid'
    )}-deleted.json`;

    this._isDeletedFeaturesFetched = true;
    this._deletedFeatures = await fetch(archiveFileUrl)
      .then(res => res.json())
      .catch(() => []);

    return this._deletedFeatures;
  },

  async getArchivedFeatures(fragment) {
    if (this._isArchivedFeaturesFetched) {
      return this._archivedFeatures;
    }

    const archiveFileUrl = `/files/theme/${fragment}/overPassCache/${this.get(
      'uuid'
    )}-archived.json`;

    this._isArchivedFeaturesFetched = true;
    this._archivedFeatures = await fetch(archiveFileUrl)
      .then(res => res.json())
      .catch(() => []);

    return this._archivedFeatures;
  },

  deleteFeature(fragment, feature) {
    this._deletedFeatures = this._deletedFeatures.filter(
      f => f.id !== feature.id
    );

    const uuid = this.get('uuid');
    fetch(
      `${CONST.apiPath}/overPassCache/deleteFeature/${fragment}/${uuid}/${
        feature.id
      }`
    );
  },

  archiveFeature(fragment, feature) {
    this._archivedFeatures.push(feature);

    const uuid = this.get('uuid');
    fetch(
      `${CONST.apiPath}/overPassCache/archiveFeature/${fragment}/${uuid}/${
        feature.id
      }`
    );

    this.deleteFeature(fragment, feature);
  },

  getLocaleCompletion(localeCode) {
    const locale = this.get('locales')[localeCode];
    const data = {
      items: this.localizedAttributes.length,
      completed: 0
    };

    if (!locale) {
      return data;
    }

    for (const attribute of this.localizedAttributes) {
      if (locale[attribute]) {
        data.completed += 1;
      }
    }

    return data;
  }
});
