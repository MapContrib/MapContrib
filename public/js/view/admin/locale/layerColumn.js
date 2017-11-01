import Wreqr from 'backbone.wreqr';
import Marionette from 'backbone.marionette';
import ListGroup from 'ui/listGroup';
import template from 'templates/admin/locale/layerColumn.ejs';
import MapUi from 'ui/map';
import format from 'math.format';

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

  regions: {
    list: '.rg_list'
  },

  ui: {
    column: '.column'
  },

  initialize() {
    this._radio = Wreqr.radio.channel('global');
  },

  onRender() {
    const listGroup = new ListGroup({
      collection: this.model.get('layers'),
      labelAttribute: 'name',
      reorderable: false,
      removeable: false,
      getRightIcon: model => MapUi.buildLayerHtmlIcon(model),
      placeholder: document.l10n.getSync(
        'uiListGroup_placeholderNothingToTranslate'
      ),
      getProgression: model => {
        const data = model.getLocaleCompletion(this.options.locale);
        return format(data.completed / data.items * 100, {
          floor: 1,
          ifInfinity: 0
        });
      }
    });

    this.listenTo(listGroup, 'item:select', this._onSelect);

    this.getRegion('list').show(listGroup);
  },

  onBeforeOpen() {
    this._radio.vent.trigger('column:closeAll', [this.cid]);
    this._radio.vent.trigger('widget:closeAll', [this.cid]);
  },

  open() {
    this.triggerMethod('open');
    return this;
  },

  close() {
    this.triggerMethod('close');
    return this;
  },

  _onSelect(model) {
    const uuid = model.get('uuid');
    const locale = this.options.locale;
    this.options.router.navigate(
      `admin/locale/${locale}/layer/edit/${uuid}`,
      true
    );
  }
});
