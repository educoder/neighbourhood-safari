(function () {
  "use strict";

  var smartboard = new this.Skeletor.App();
  var Model = this.Skeletor.Model;


  smartboard.init = function() {
    _.extend(this, Backbone.Events);

    var requiredConfig = {
      drowsy: {
        url: 'string',
        db: 'string'
      },
      wakeful: {
        url: 'string'
      },
      rollcall: {db: 'string'},
      login_picker:'boolean',
      runs:'object'
    };

    // TODO: load this from config.json
    smartboard.loadConfig();
    smartboard.verifyConfig(smartboard.config, requiredConfig);

    // TODO: Pick run id
    var app = {};
    app.runId = "5ag";
    // TODO: should ask at startup
    var DATABASE = smartboard.config.drowsy.db+'-'+app.runId;

    Skeletor.Model.init(smartboard.config.drowsy.url, DATABASE)
    .then(function () {
      return Skeletor.Model.wake(smartboard.config.wakeful.url);
    }).done(function () {
      smartboard.ready();
    });
  };

  smartboard.ready = function() {
    smartboard.runState = Skeletor.getState('RUN');
    if (!smartboard.runState) {
      smartboard.runState = Skeletor.setState('RUN', {
        phase: 'brainstorm'
      });
    }
    smartboard.runState.wake(smartboard.config.wakeful.url);

    smartboard.wall = new smartboard.View.Wall({
      el: '#wall'
    });

    smartboard.wall.on('ready', function () {
      smartboard.trigger('ready');
    });

    smartboard.wall.ready();
  };

  smartboard.createNewTag = function (tagName) {
    var tag = new Model.Tag({
      name: tagName,
      created_at: new Date()
    });
    tag.wake(smartboard.config.wakeful.url);

    return Model.awake.tags.add(tag);
  };

  this.Skeletor.Smartboard = smartboard;

}).call(this);