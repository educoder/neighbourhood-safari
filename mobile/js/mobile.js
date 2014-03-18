/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:true */
/*global  Backbone, _, jQuery, Rollcall */

(function() {
  "use strict";
  var HG = this.HG || {};
  this.HG.Mobile = this.HG.Mobile || new HG.App();
  var Model = this.Skeletor.Model;
  HG.Model = Model;
  var app = this.HG.Mobile;

  app.config = null;
  app.requiredConfig = {
    drowsy: {
      url: 'string',
      db: 'string',
      uic_url: 'string'
    },
    wakeful: {
      url: 'string'
    },
    rollcall: {db: 'string'},
    login_picker:'boolean',
    runs:'object'
  };

  app.rollcall = null;
  app.runId= null;
  app.users = null; // users collection
  app.username = null;
  app.runState = null;
  app.userState = null;
  app.numOfStudents = 0;

  var DATABASE = null;
  app.stateData = null;

  app.currentNote = null;
  app.currentReply = {};

  app.inputView = null;
  app.listView = null;
  // app.loginButtonsView = null;

  // app.keyCount = 0;
  // app.autoSaveTimer = window.setTimeout(function() { console.log("timer activated"); } ,10);

  app.init = function() {
    /* CONFIG */
    app.loadConfig('../config.json');
    app.verifyConfig(app.config, app.requiredConfig);

    // TODO: should ask at startup
    DATABASE = app.config.drowsy.db;

    // hide all rows initially
    app.hideAllRows();

    if (app.rollcall === null) {
      app.rollcall = new Rollcall(app.config.drowsy.url, app.config.rollcall.db);
    }

    app.handleLogin();

  };

  app.handleLogin = function () {

    // if (jQuery.QueryString.runId && jQuery.QueryString.username) {
    //   console.log ("URL parameter correct :)");
    //   app.runId = jQuery.QueryString.runId;
    //   app.username = jQuery.QueryString.username;
    // } else {
    //   // retrieve user name from cookie if possible otherwise ask user to choose name
    //   app.runId = jQuery.cookie('hunger-games_mobile_runId');
    //   app.username = jQuery.cookie('hunger-games_mobile_username');
    // }

    if (jQuery.url().param('runId') && jQuery.url().param('username')) {
      console.log ("URL parameter correct :)");
      app.runId = jQuery.url().param('runId');
      app.username = jQuery.url().param('username');
    } else {
      // retrieve user name from cookie if possible otherwise ask user to choose name
      app.runId = jQuery.cookie('hunger-games_mobile_runId');
      app.username = jQuery.cookie('hunger-games_mobile_username');
    }

    if (app.username && app.runId) {
      // We have a user in cookies so we show stuff
      console.log('We found user: '+app.username);

      // make sure the app.users collection is always filled
      app.rollcall.usersWithTags([app.runId])
      .done(function (usersInRun) {
        console.log(usersInRun);

        if (usersInRun && usersInRun.length > 0) {
          app.users = usersInRun;

          // sort the collection by username
          app.users.comparator = function(model) {
            return model.get('username');
          };
          app.users.sort();

          var currentUser = app.users.findWhere({username: app.username});

          if (currentUser) {
            jQuery('.username-display a').text(app.runId+' - '+currentUser.get('display_name'));

            hideLogin();
            showUsername();

            app.setup();
          } else {
            console.log('User '+usersInRun+' not found in run '+app.runId+'. Show login picker!');
            logoutUser();
          }
        } else {
          console.log("Either run is wrong or run has not users. Wrong URL or Cookie? Show login");
          // fill modal dialog with user login buttons
          logoutUser();
        }
      });
    } else {
      console.log('No user and run found so prompt for username and runId');
      hideUsername();
      // fill modal dialog with user login buttons
      if (app.config.login_picker) {
        hideLogin();
        showRunPicker();
        // showUserLoginPicker(app.runId);
      } else {
        showLogin();
        hideUserLoginPicker();
      }
    }

    // click listener that sets username
    jQuery('#login-button').click(function() {
      app.loginUser(jQuery('#username').val());
      // prevent bubbling events that lead to reload
      return false;
    });

    // click listener that log user out
    jQuery('.logout-user').click(function() {
      logoutUser();
    });
  };

  app.setup = function() {
    /* pull users, then initialize the model and wake it up, then pull everything else */
    HG.Model.init(app.config.drowsy.url, DATABASE+'-'+app.runId)
    .then(function () {
      console.log('model initialized - now waking up');
      return HG.Model.wake(app.config.wakeful.url);
    })
    .done(function () {
      console.log('model awake - now calling ready');
      app.ready();
    });

    /* MISC */
    jQuery().toastmessage({
      position : 'middle-center'
    });

  };

  app.ready = function() {
    jQuery.when(tryPullAll()).done(function(stateData, configurationData, recentBoutData, activityDropdownData) {
      console.log('tryPullAll and Patchgraph.init() finished so we do the rest of ready()');

      /* ======================================================
       * Setting up the Backbone Views to render data
       * coming from Collections and Models
       * ======================================================
       */
      if (app.inputView === null) {
        app.inputView = new app.View.InputView({
          el: '.notes-screen-input'
          // model: app.currentNote
        });
      }

      if (app.listView === null) {
        app.listView = new app.View.ListView({
          el: '#list-screen',
          collection: HG.Model.awake.notes
        });
      }

      setProjectName(app.config.project_name);

      /* ======================================================
       * Function to enable click listeners in the UI
       * Beware: some click listeners might belong into Views
       * ======================================================
       */
      setUpClickListeners();

      // show notes-screen - is this the default? TODO: check with design team where the first pedagogical step should be
      jQuery('#notes-screen').removeClass('hidden');
      jQuery('.nav-pills .notes-button').addClass('active'); // highlight notes selection in nav bar
    });
  };


  //*************** MAIN FUNCTIONS (RENAME ME) ***************//

  app.addNote = function(noteData) {
    app.currentNote = new Model.Note(noteData);
    app.currentNote.wake(app.config.wakeful.url);
    app.currentNote.save();
    Model.awake.notes.add(app.currentNote);
  };

  app.saveCurrentNote = function() {
    // app.currentNote.published = true;
    app.currentNote.save();
    app.currentNote = null;
  };

  app.createReply = function(noteId) {
    app.currentReply.content = '';
    app.currentReply.author = app.username;
    app.currentReply.related_note_id = noteId;
  };

  app.saveCurrentReply = function(replyText) {
    var note = HG.Model.awake.notes.get(app.currentReply.related_note_id);
    note.addBuildOn(app.username, replyText);
    note.wake(app.config.wakeful.url);
    note.save();
    app.currentReply = {};
  };


  //*************** HELPER FUNCTIONS ***************//

  var tryPullAll = function() {
    // return jQuery.when(tryPullStateData(), tryPullStatisticsData(), tryPullConfigurationData(), tryPullRecentBoutData(), tryPullActivityData());
    // return jQuery.when(tryPullActivityData());
  };

  var tryPullActivityData = function() {
    var selector = '{"runId":"'+app.runId+'"}';
    var promise = jQuery.get(app.config.drowsy.url+'/'+DATABASE+'/activity?selector='+selector)
      .then(function (data) {
        var sortedData = _.sortBy(data, function (a) {
          return a._id;
        });
        _.each(sortedData, function(activity) {
          app.activityDropdownData.push(activity);
        });
        console.log("Activity Data pulled");
      });

    return promise;
  };


  var tryPullUsersData = function() {
    if (app.runId) {
      app.rollcall.usersWithTags([app.runId])
      .done(function (availableUsers) {
        console.log("Users data pulled!");
        app.users = availableUsers;
      })
      .fail(function() { console.error("Error pulling users data..."); });
    }
  };


  var idToTimestamp = function(id) {
    var timestamp = id.substring(0,8);
    var seconds = parseInt(timestamp, 16);
    return seconds;
    // date = new Date( parseInt(timestamp, 16) * 1000 );
    // return date;
  };

  /**
   *  Function where most of the click listener should be setup
   *  called very late in the init process, will try to look it with Promise
   */
  var setUpClickListeners = function () {
    // Show notes screen
    jQuery('.notes-button').click(function() {
      if (app.username) {
        jQuery('.nav-pills li').removeClass('active'); // unmark all nav items
        jQuery(this).addClass('active');

        app.hideAllRows();
        jQuery('#notes-screen').removeClass('hidden');
      }
    });

    // Refresh and repull data - this may go eventually
    jQuery('.refresh-button').click(function() {
      jQuery().toastmessage('showNoticeToast', "Refreshing...");

      tryPullAll().done(function(stateData, configurationData, recentBoutData) {
        console.log('tryPullAll finished and we could wait for it or even manipulate data');
      });

      console.log('Refresh the harvest planning graph on user request');
      HG.Patchgraph.refresh().done(function(){
        console.log('Patchgraph data refreshed');
      });
    });


  };

  var setProjectName = function (name) {
    jQuery('.brand').text(name);
  };


  //*************** LOGIN FUNCTIONS ***************//

  app.loginUser = function (username) {
    // retrieve user with given username
    app.rollcall.user(username)
    .done(function (user) {
      if (user) {
        console.log(user.toJSON());

        app.username = user.get('username');

        jQuery.cookie('hunger-games_mobile_username', app.username, { expires: 1, path: '/' });
        jQuery('.username-display a').text(app.runId+' - '+user.get('display_name'));

        // show notes-screen
        jQuery('#notes-screen').removeClass('hidden');

        hideLogin();
        hideUserLoginPicker();
        showUsername();

        app.setup();
      } else {
        console.log('User '+username+' not found!');
        if (confirm('User '+username+' not found! Do you want to create the user to continue?')) {
            // Create user and continue!
            console.log('Create user and continue!');
        } else {
            // Do nothing!
            console.log('No user logged in!');
        }
      }
    });
  };

  var logoutUser = function () {
    jQuery.removeCookie('hunger-games_mobile_username',  { path: '/' });
    jQuery.removeCookie('hunger-games_mobile_runId',  { path: '/' });

    // to make reload not log us in again after logout is called we need to remove URL parameters
    if (window.location.search && window.location.search !== "") {
      var reloadUrl = window.location.origin + window.location.pathname;
      window.location.replace(reloadUrl);
    } else {
      window.location.reload();
    }
    return true;
  };

  var showLogin = function () {
    jQuery('#login-button').removeAttr('disabled');
    jQuery('#username').removeAttr('disabled');
  };

  var hideLogin = function () {
    jQuery('#login-button').attr('disabled','disabled');
    jQuery('#username').attr('disabled','disabled');
  };

  var hideUserLoginPicker = function () {
    // hide modal dialog
    jQuery('#login-picker').modal('hide');
  };

  var showUsername = function () {
    jQuery('.username-display').removeClass('hide');
  };

  var hideUsername = function() {
    jQuery('.username-display').addClass('hide');
  };

  var showRunPicker = function(runs) {
    jQuery('.login-buttons').html(''); //clear the house
    console.log(app.config.runs);

    // change header
    jQuery('#login-picker .modal-header h3').text('Please choose your class');

    _.each(app.config.runs, function(run) {
      var button = jQuery('<button class="btn btn-large btn-primary login-button">');
      button.val(run);
      button.text(run);
      jQuery('.login-buttons').append(button);
    });

    // register click listeners
    jQuery('.login-button').click(function() {
      app.runId = jQuery(this).val();
      jQuery.cookie('hunger-games_mobile_runId', app.runId, { expires: 1, path: '/' });
      // jQuery('#login-picker').modal("hide");
      showUserLoginPicker(app.runId);
    });

    // show modal dialog
    jQuery('#login-picker').modal({backdrop: 'static'});
  };

  var showUserLoginPicker = function(runId) {
    // change header
    jQuery('#login-picker .modal-header h3').text('Please login with your squirrel ID');

    // retrieve all users that have runId
    app.rollcall.usersWithTags([runId])
    .done(function (availableUsers) {
      jQuery('.login-buttons').html(''); //clear the house
      console.log(availableUsers);
      app.users = availableUsers;

      // sort the collection by username
      app.users.comparator = function(model) {
        return model.get('display_name');
      };
      app.users.sort();

      app.users.each(function(user) {
        var button = jQuery('<button class="btn btn-large btn-primary login-button">');
        button.val(user.get('username'));
        button.text(user.get('display_name'));
        jQuery('.login-buttons').append(button);
      });

      // register click listeners
      jQuery('.login-button').click(function() {
        var clickedUserName = jQuery(this).val();
        app.loginUser(clickedUserName);
      });

      // show modal dialog
      // jQuery('#login-picker').modal({backdrop: 'static'});
    });
  };

  app.hideAllRows = function () {
    jQuery('.row-fluid').each(function (){
      jQuery(this).addClass('hidden');
    });
  };


  /**
    Function that is called on each keypress on username input field (in a form).
    If the 'return' key is pressed we call loginUser with the value of the input field.
    To avoid further bubbling, form submission and reload of page we have to return false.
    See also: http://stackoverflow.com/questions/905222/enter-key-press-event-in-javascript
  **/
  app.interceptKeypress = function(e) {
    if (e.which === 13 || e.keyCode === 13) {
      app.loginUser(jQuery('#username').val());
      return false;
    }
  };

  app.turnUrlsToLinks = function(text) {
    var urlRegex = /(https?:\/\/[^\s]+)/g;
    var urlText = text.replace(urlRegex, '<a href="$1">$1</a>');
    return urlText;
    // return text.replace(urlRegex, function (url) {
    //     alert('<a href="' + url + '">' + url + '</a>');
    // });
  };


  this.HG = HG;

}).call(this);