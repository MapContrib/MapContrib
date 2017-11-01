import _ from 'underscore';
import config from 'config';
import logger from '../lib/logger';
import Database from '../lib/database';
import SERVER_CONST from '../const';
import PUBLIC_CONST from '../public/js/const';
import OverPassCache from '../lib/overPassCache';

const CONST = { ...SERVER_CONST, ...PUBLIC_CONST };
const database = new Database();

if (config.get('client.overPassCacheEnabled') !== true) {
  logger.info('The OverPass cache is not enabled');
  process.exit();
}

export default class UpdateOverPassCache {
  constructor(db, cache) {
    this._db = db;
    this._cache = cache;

    this._callbacks = [
      this._nextIteration.bind(this),
      this._retryIteration.bind(this),
      this._setLayerStateSuccess.bind(this),
      this._setLayerStateError.bind(this),
      this._setLayerDeletedFeatures.bind(this)
    ];
  }

  start() {
    logger.debug('start');

    this._themeCollection = this._db.collection('theme');

    const findOptions = {
      'layers.type': CONST.layerType.overpass,
      'layers.cache': true
    };

    if (process.argv.length === 3) {
      findOptions['layers.uuid'] = process.argv[2];
    }

    this._themeCollection.find(findOptions).toArray((err, themes) => {
      if (err) {
        throw err;
      }

      if (themes.length === 0) {
        return this._end();
      }

      this._iterate = UpdateOverPassCache._iterateLayers(themes);

      const iteration = this._iterate.next();

      return this._cache.process(iteration.value.theme, iteration.value.layer, ...this._callbacks);
    });
  }

  static *_iterateLayers(themes) {
    logger.debug('_iterateLayers');

    const shuffledThemes = _.shuffle(themes);

    for (const theme of shuffledThemes) {
      const shuffledLayers = _.shuffle(theme.layers);

      for (const layer of shuffledLayers) {
        if (layer.cache !== true) {
          continue;
        }

        if (layer.type !== CONST.layerType.overpass) {
          continue;
        }

        yield { theme, layer };
      }
    }
  }

  _nextIteration() {
    logger.debug('_nextIteration');

    const iteration = this._iterate.next();

    if (iteration.done) {
      return this._end();
    }

    return setTimeout(
      this._cache.process.bind(
        this._cache,
        iteration.value.theme,
        iteration.value.layer,
        ...this._callbacks
      ),
      CONST.overPassCron.secondsBetweenIterations * 1000
    );
  }

  _retryIteration(theme, layer) {
    logger.debug('_retryIteration');

    setTimeout(
      this._cache.process.bind(this._cache, theme, layer, ...this._callbacks),
      CONST.overPassCron.secondsBetweenIterationsRetries * 1000
    );
  }

  _setLayerStateSuccess(theme, layer, bounds, filePath) {
    logger.debug('_setLayerStateSuccess');

    return new Promise(resolve => {
      this._themeCollection.updateOne(
        {
          _id: theme._id,
          'layers.uuid': layer.uuid
        },
        {
          $set: {
            'layers.$.fileUri': filePath,
            'layers.$.cacheUpdateSuccess': true,
            'layers.$.cacheUpdateSuccessDate': new Date().toISOString(),
            'layers.$.cacheUpdateDate': new Date().toISOString(),
            'layers.$.cacheUpdateError': null,
            'layers.$.cacheBounds': bounds
          }
        },
        () => {
          resolve();
        }
      );
    });
  }

  _setLayerStateError(theme, layer, error) {
    logger.debug('_setLayerStateError');

    return new Promise(resolve => {
      this._themeCollection.updateOne(
        {
          _id: theme._id,
          'layers.uuid': layer.uuid
        },
        {
          $set: {
            'layers.$.fileUri': null,
            'layers.$.cacheUpdateSuccess': false,
            'layers.$.cacheUpdateDate': new Date().toISOString(),
            'layers.$.cacheUpdateError': error,
            'layers.$.cacheBounds': null
          }
        },
        () => {
          resolve();
        }
      );
    });
  }

  _setLayerDeletedFeatures(theme, layer, deletedFeatures) {
    logger.debug('_setLayerDeletedFeatures');

    if (!layer.cacheDeletedFeatures) {
      layer.cacheDeletedFeatures = [];
    }

    return new Promise(resolve => {
      if (deletedFeatures.length === 0) {
        resolve();
      }

      layer.cacheDeletedFeatures.push(...deletedFeatures);

      this._themeCollection.updateOne(
        {
          _id: theme._id,
          'layers.uuid': layer.uuid
        },
        {
          $set: {
            'layers.$.cacheDeletedFeatures': layer.cacheDeletedFeatures
          }
        },
        () => {
          resolve();
        }
      );
    });
  }

  _end() {
    logger.info('Update of the OverPass cache finished');

    this._db.close();
  }
}

database.connect((err, db) => {
  if (err) throw err;

  const cache = new OverPassCache(db);
  const cron = new UpdateOverPassCache(db, cache);

  logger.info('Update of the OverPass cache started');

  cron.start();
});
