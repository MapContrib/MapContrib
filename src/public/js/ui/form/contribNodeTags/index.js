
var Marionette = require('backbone.marionette');
var ContribNodeTagsCollection = require('./collection');
var ContribNodeTagsListItemView = require('./listItem');


module.exports = Marionette.CollectionView.extend({

    childView: ContribNodeTagsListItemView,

    setTags: function (tags) {

        this.collection = new ContribNodeTagsCollection( tags );

        if (tags.length === 0) {

            this.collection.add({
                'keyReadOnly': false,
                'valueReadOnly': false
            });
        }

        this.render();
    },

    addTag: function () {

        this.collection.add({
            'keyReadOnly': false,
            'valueReadOnly': false
        });
    },

    getTags: function () {

        return this.collection.toJSON();
    },
});