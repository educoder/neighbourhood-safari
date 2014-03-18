(function () {
  "use strict";

  var Skeletor = {};

  Skeletor.getState = function(forEntity) {
    var state;
    state = Skeletor.Model.awake.states.findWhere({
      entity: forEntity
    });
    if (!state) {
      console.warn("There is no state data for entity '" + forEntity + "'!");
    }
    return state;
  };

  Skeletor.setState = function(forEntity, values) {
    var state;
    state = Skeletor.getState(forEntity);
    if (!state) {
      state = new Skeletor.Model.State();
      state.set('entity', forEntity);
      Skeletor.Model.awake.states.add(state);
    }
    state.set(values);
    state.set('modified_at', new Date());
    state.save();
    return state;
  };

  // basc class for Skeletor-based apps; inherit from this!
  Skeletor.App = function () { };

  /**
  Retrieves a JSON config file from "/config.json" and configures
  the given Sail app accordingly.
  */
  Skeletor.App.prototype.loadConfig = function(configUrl) {
    var _this = this;
    configUrl = configUrl || '../../config.json';
    jQuery.ajax(
      {
        url: configUrl,
        dataType: 'json',
        async: false,
        cache: false,
        success: function(data) {
          _this.config = data;
        },
        error: function(xhr, code, error) {
          console.error("Couldn't load `"+configUrl+"`: ", code, error, xhr);
          alert("Couldn't load `"+configUrl+"` because:\n\n"+error+" ("+code+")");
        }
      }
    );
  };

  Skeletor.App.prototype.verifyConfig = function(config, required, path) {
    var _this = this;
    var curPath = path || null;

    _.each(_.keys(required), function (req) {
      if (typeof required[req] == 'object') {
        _this.verifyConfig(config[req], required[req], (curPath ? curPath + "." : "") + req);
      } else {
        var err;
        if (!config) {
          err = "Missing configuration value for key '"+curPath+"'! Check your config.json";
        } else if (!config[req]) {
          err = "Missing configuration value for key '"+curPath+"."+req+"'! Check your config.json";
        } else if (typeof config[req] != required[req]) {
          err = "Configuration value for '"+req+"' must be a "+(typeof required[req])+" but is a "+(typeof config[req])+"! Check your config.json";
        }

        if (err) {
          console.error(err);
          throw err;
        }
      }
    });
  };

  this.Skeletor = Skeletor;

}).call(this);