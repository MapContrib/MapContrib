import { ObjectID } from 'mongodb';
import logger from '../lib/logger';
import UserModel from '../public/js/model/user';

let options = {
  CONST: undefined,
  database: undefined
};

function setOptions(hash) {
  options = hash;
}

class Api {
  static post(req, res) {
    const collection = options.database.collection('user');
    const model = new UserModel(req.body);

    if (!model.isValid()) {
      res.sendStatus(400);

      return true;
    }

    collection.insertOne(req.body, { safe: true }, (err, results) => {
      if (err) {
        logger.error(err);
        res.sendStatus(500);

        return true;
      }

      const result = results.ops[0];
      result._id = result._id.toString();

      return res.send(result);
    });

    return true;
  }

  static get(req, res) {
    Api.findFromId(req, res, req.params._id, user => {
      res.send(user);
    });
  }

  static findFromId(req, res, _id, callback) {
    if (_id === 'me') {
      _id = req.user;
    } else if (req.user !== _id) {
      res.sendStatus(401);

      return true;
    } else if (!options.CONST.pattern.mongoId.test(_id)) {
      res.sendStatus(400);

      return true;
    }

    const collection = options.database.collection('user');

    collection
      .find({
        _id: new ObjectID(_id)
      })
      .toArray((err, results) => {
        if (err) {
          logger.error(err);
          res.sendStatus(500);

          return true;
        }

        if (results.length === 0) {
          res.sendStatus(404);

          return true;
        }

        const result = results[0];
        result._id = result._id.toString();

        return callback(result);
      });

    return true;
  }

  static findFromIds(req, res, _ids, osmIds) {
    const collection = options.database.collection('user');
    let filteredIds = [];
    let filteredOsmIds = [];

    if (_ids) {
      filteredIds = _ids.filter(_id => options.CONST.pattern.mongoId.test(_id));
    }

    if (osmIds) {
      filteredOsmIds = osmIds.filter(osmId =>
        options.CONST.pattern.integer.test(osmId)
      );
    }

    return new Promise((resolve, reject) => {
      collection
        .find({
          $or: [
            { _id: { $in: filteredIds.map(_id => new ObjectID(_id)) } },
            { osmId: { $in: filteredOsmIds } }
          ]
        })
        .toArray((err, results) => {
          if (err) {
            logger.error(err);
            res.sendStatus(500);

            reject();
          }

          resolve(
            results.map(result => ({
              _id: result._id.toString(),
              osmId: result.osmId,
              displayName: result.displayName,
              avatar: result.avatar
            }))
          );
        });
    });
  }

  static getAll(req, res) {
    const collection = options.database.collection('user');

    collection.find().toArray((err, results) => {
      if (err) {
        logger.error(err);
        res.sendStatus(500);

        return true;
      }

      if (results.length > 0) {
        results.forEach(result => {
          result._id = result._id.toString();
        });
      }

      return res.send(results);
    });
  }

  static put(req, res) {
    if (req.user !== req.params._id) {
      res.sendStatus(401);

      return true;
    }

    if (!options.CONST.pattern.mongoId.test(req.params._id)) {
      res.sendStatus(400);

      return true;
    }

    const newJson = req.body;
    const collection = options.database.collection('user');
    const model = new UserModel(newJson);

    if (!model.isValid()) {
      res.sendStatus(400);

      return true;
    }

    newJson._id = new ObjectID(req.params._id);

    collection.updateOne(
      {
        _id: newJson._id
      },
      newJson,
      { safe: true },
      err => {
        if (err) {
          logger.error(err);
          res.sendStatus(500);

          return true;
        }

        req.session.user = newJson;

        return res.send({});
      }
    );

    return true;
  }

  static delete(req, res) {
    if (req.user !== req.params._id) {
      res.sendStatus(401);

      return true;
    }

    if (!options.CONST.pattern.mongoId.test(req.params._id)) {
      res.sendStatus(400);

      return true;
    }

    const collection = options.database.collection('user');

    collection.remove(
      {
        _id: new ObjectID(req.params._id)
      },
      { safe: true },
      err => {
        if (err) {
          logger.error(err);
          res.sendStatus(500);

          return true;
        }

        return res.send({});
      }
    );

    return true;
  }

  static logout(req, res) {
    req.logout();

    req.session.destroy(err => {
      if (err) {
        logger.error(err);
        return res.sendStatus(500);
      }

      return res.status(200).send('OK');
    });
  }
}

export default {
  setOptions,
  Api
};
