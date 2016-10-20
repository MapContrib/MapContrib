
import config from 'config';
import path from 'path';
import fs from 'fs';
import mkdirp from 'mkdirp';
import osmtogeojson from 'osmtogeojson';
import { XMLHttpRequest } from 'xmlhttprequest';
import logger from '../lib/logger';
import SERVER_CONST from '../const';
import PUBLIC_CONST from '../public/js/const';
import OverPassHelper from '../public/js/helper/overPass';
import GeoUtils from '../public/js/core/geoUtils.js';


const CONST = {...SERVER_CONST, ...PUBLIC_CONST};



export default class OverPassCache {
    constructor (db) {
        this._db = db;
    }

    process (theme, layer, nextCallback, retryCallback, setSuccess, setError) {
        logger.debug('process');

        if (layer.type !== CONST.layerType.overpass) {
            return nextCallback();
        }

        if (layer.cache === false) {
            return nextCallback();
        }

        logger.info('Next request');
        logger.info('Theme fragment:', theme.fragment);
        logger.info('Layer uniqid:', layer.uniqid);

        const bounds = GeoUtils.zoomLatLngWidthHeightToBbox(
            theme.zoomLevel,
            theme.center.lat,
            theme.center.lng,
            3840,
            2160
        );

        const url = OverPassHelper.buildUrlForCache(
            config.get('client.overPassEndPoint'),
            layer.overpassRequest,
            config.get('client.overPassCacheFileSize'),
            bounds
        );

        this._retrieveData(url)
        .then(data => {
            this._saveCacheFile(
                theme.fragment,
                layer.uniqid,
                data
            )
            .then( filePath => setSuccess(theme, layer, bounds, filePath) )
            .then( nextCallback );
        })
        .catch(xhr => {
            if (xhr.status === 429) {
                logger.info('OverPass says: Too many requests... Retrying in a few seconds');
                return retryCallback(theme, layer);
            }

            if (xhr.status === 400) {
                logger.debug('OverPass says: Bad request');

                return this._deleteCacheFile(
                    theme.fragment,
                    layer.uniqid
                )
                .then( setError(theme, layer, CONST.overPassCacheError.badRequest) )
                .then( nextCallback );
            }

            if (xhr.status !== 200) {
                logger.debug('Unknown error, next!');

                return this._deleteCacheFile(
                    theme.fragment,
                    layer.uniqid
                )
                .then( setError(theme, layer, CONST.overPassCacheError.unknown) )
                .then( nextCallback );
            }

            let error;
            const overPassJson = JSON.parse(xhr.responseText);

            if ( overPassJson.remark.indexOf('Query timed out') > -1 ) {
                logger.debug('OverPass says: Timeout');
                error = CONST.overPassCacheError.timeout;
            }
            else if ( overPassJson.remark.indexOf('Query run out of memory') > -1 ) {
                logger.debug('OverPass says: Out of memory');
                error = CONST.overPassCacheError.memory;
            }

            return this._deleteCacheFile(
                theme.fragment,
                layer.uniqid
            )
            .then( setError(theme, layer, error) )
            .then( nextCallback );
        });
    }

    _retrieveData (url) {
        logger.debug('_retrieveData');

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.open('GET', url, false);
            xhr.send(null);

            if (xhr.status === 200) {
                const overPassJson = JSON.parse(xhr.responseText);

                if (overPassJson.remark) {
                    return reject(xhr);
                }

                return resolve(overPassJson);
            }

            return reject(xhr);
        });
    }

    _buildDirectories (themeFragment, layerUuid) {
        logger.debug('_buildDirectories');

        const publicDirectory = path.resolve(__dirname, '..', 'public');
        const publicCacheDirectory = `files/theme/${themeFragment}/overPassCache/`;
        const cacheDirectory = path.resolve( publicDirectory, publicCacheDirectory );
        const filePath = path.join( publicCacheDirectory, `${layerUuid}.geojson` );

        if ( !fs.existsSync( cacheDirectory ) ) {
            mkdirp.sync(cacheDirectory);
        }

        return {
            publicDirectory,
            publicCacheDirectory,
            cacheDirectory,
            filePath,
        };
    }

    _saveCacheFile (themeFragment, layerUuid, overPassResult) {
        logger.debug('_saveCacheFile');

        return new Promise((resolve, reject) => {
            const overPassGeoJson = osmtogeojson(overPassResult);
            const {
                publicDirectory,
                filePath
            } = this._buildDirectories(themeFragment, layerUuid);

            fs.writeFile(
                path.resolve( publicDirectory, filePath ),
                JSON.stringify( overPassGeoJson ),
                () => {
                    resolve(`/${filePath}`);
                }
            );
        });
    }

    _deleteCacheFile (themeFragment, layerUuid) {
        logger.debug('_deleteCacheFile');

        return new Promise((resolve, reject) => {
            const {
                publicDirectory,
                filePath
            } = this._buildDirectories(themeFragment, layerUuid);

            fs.unlink(
                path.resolve( publicDirectory, filePath ),
                () => {
                    resolve();
                }
            );
        });
    }
}