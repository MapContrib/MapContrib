import Wreqr from 'backbone.wreqr';
import Marionette from 'backbone.marionette';
import PresetNodeTagsList from 'ui/form/presetNodeTags';
import template from 'templates/admin/preset/presetEditColumn.ejs';

export default Marionette.LayoutView.extend({
  template,

  behaviors() {
    return {
      l20n: {},
      column: {
        appendToBody: true,
        destroyOnClose: true,
        routeOnClose: this.options.routeOnClose,
        triggerRouteOnClose: this.options.triggerRouteOnClose
      }
    };
  },

  ui: {
    column: '.column',
    bottom: '.bottom',
    name: '#preset_name',
    description: '#preset_description',
    addTagBtn: '.add_tag_btn'
  },

  events: {
    'click @ui.addTagBtn': 'onAddTagClick',
    submit: 'onSubmit'
  },

  regions: {
    tagList: '.rg_tag_list'
  },

  initialize() {
    this._radio = Wreqr.radio.channel('global');

    this._oldModel = this.model.clone();
  },

  open() {
    this.triggerMethod('open');
    return this;
  },

  close() {
    this.triggerMethod('close');
    return this;
  },

  onRender() {
    this._tagList = new PresetNodeTagsList({
      tags: this.model.get('tags'),
      iDPresetsHelper: this.options.iDPresetsHelper,
      customTags: this.options.theme.get('tags')
    });

    this.getRegion('tagList').show(this._tagList);
  },

  onBeforeOpen() {
    this._radio.vent.trigger('column:closeAll', [this.cid]);
    this._radio.vent.trigger('widget:closeAll', [this.cid]);
  },

  onSubmit(e) {
    e.preventDefault();

    this.model.set('name', this.ui.name.val().trim());
    this.model.set('description', this.ui.description.val().trim());
    this.model.set('tags', this._tagList.getTags());

    if (this.options.isNew) {
      this.options.theme.get('presets').add(this.model);
    }

    this.model.updateModificationDate();
    this.options.theme.updateModificationDate();
    this.options.theme.save(
      {},
      {
        success: () => this.close(),

        error: () => {
          // FIXME
          console.error('nok'); // eslint-disable-line
        }
      }
    );
  },

  onAddTagClick() {
    this._tagList.addTag();
    this._scrollToBottom();
  },

  _scrollToBottom() {
    window.requestAnimationFrame(() => {
      this.ui.bottom[0].scrollIntoView({ behavior: 'smooth' });
    });
  }
});
