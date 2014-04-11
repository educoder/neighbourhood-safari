/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:true */
/*global  Backbone, Skeletor, _, jQuery, Rollcall */

(function() {
  "use strict";
  var Skeletor = this.Skeletor || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || new Skeletor.App();
  var Model = this.Skeletor.Model;
  Skeletor.Model = Model;
  var app = this.Skeletor.Mobile;

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
    login_picker:'string',
    runs:'object'
  };

  app.rollcall = null;
  app.runId= null;
  app.users = null; // users collection
  app.groups = null; // groups collection
  app.tags = null;
  app.backpacks = null;
  app.username = null;
  app.pausable = false;
  app.runState = null;
  app.userState = null;
  app.numOfStudents = 0;

  var DATABASE = null;
  app.stateData = null;

  app.currentNote = null;
  app.currentReply = {};

  app.writeView = null;
  app.readView = null;
  // app.loginButtonsView = null;

  app.keyCount = 0;
  app.autoSaveTimer = window.setTimeout(function() { console.log("timer activated"); } ,10);

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
      console.log('We found username: '+app.username);

      if (app.config.login_picker === "user") {
        // make sure the app.users collection is always filled
        app.rollcall.usersWithRuns([app.runId])
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

              // hideLogin();
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
      } else if (app.config.login_picker === "group") {
        // make sure the app.users collection is always filled
        app.rollcall.groups({"runs":{"$all": [app.runId]}, "groupname": app.username})
        .done(function (groupRunMatch) {
          console.log(groupRunMatch);

          var group = _.first(groupRunMatch.models);
          if (group) {

              jQuery('.username-display a').text(app.runId+' - '+group.get('display_name'));

              app.pausable = true;

              // hideLogin();
              showUsername();

              app.setup();
          } else {
            console.log("We didn't find a group that matches the runId and name...");
            console.log("...trying to see if this is a teacher...");

            // here we should detect that username is a user that is a teacher and
            // enable an additional screen
            app.rollcall.user(app.username)
            .done( function(user) {
              if (user && user.isTeacher()) {
                // enable teacher stuff
                console.log('...got ourselves a teacher here :)');
                app.pausable = false;
                jQuery('.teacher-button').show();

                showUsername();

                app.setup();
              } else {
                // nothing to do really
                console.log('...user is no teacher or a group so we call logoutUser()');

                // fill modal dialog with user login buttons
                logoutUser();
              }
            });


          }
        });
      } else {
        console.error("wrong login_picker in config file. Either user or group!");
      }
    } else {
      console.log('No user and run found so prompt for runId');
      hideUsername();
      // fill modal dialog with user login buttons
      // hideLogin();
      showRunPicker();
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
    Skeletor.Model.init(app.config.drowsy.url, DATABASE+'-'+app.runId)
    .then(function () {
      console.log('model initialized - now waking up');
      return Skeletor.Model.wake(app.config.wakeful.url);
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
      if (app.writeView === null) {
        app.writeView = new app.View.WriteView({
          el: '#notes-screen-input',
          collection: Skeletor.Model.awake.notes
        });
      }

      if (app.readView === null) {
        app.readView = new app.View.ReadView({
          el: '#list-screen',
          collection: Skeletor.Model.awake.notes
        });
      }

      // these collections are not attached to a view
      app.tags = Skeletor.Model.awake.tags;
      app.backpacks = Skeletor.Model.awake.backpacks;

      setProjectName(app.config.project_name);

      /* ======================================================
       * Function to enable click listeners in the UI
       * Beware: some click listeners might belong in Views
       * ======================================================
       */
      setUpClickListeners();

      // show notes-screen - is this the default? TODO: check with design team where the first pedagogical step should be
      jQuery('#read-screen').removeClass('hidden');
      jQuery('.nav-pills .read-button').addClass('active'); // highlight notes selection in nav bar


      // TODO: ADD ME BACK IN FOR PROD
      // jQuery('.navbar').addClass('hidden');

      // jQuery('#start-screen').click(function() {
      //   jQuery('#start-screen').remove();
      //   jQuery('.navbar').removeClass('hidden');
      // });
    });
  };


  //*************** MAIN FUNCTIONS (RENAME ME) ***************//

  app.addNote = function(noteData) {
    app.currentNote = new Model.Note(noteData);
    app.currentNote.wake(app.config.wakeful.url);
    app.currentNote.save();
    Model.awake.notes.add(app.currentNote);
    return app.currentNote;
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
    var note = Skeletor.Model.awake.notes.get(app.currentReply.related_note_id);
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
      app.rollcall.usersWithRuns([app.runId])
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
    jQuery('.write-button').click(function() {
      if (app.username) {
        jQuery('.nav-pills li').removeClass('active'); // unmark all nav items
        jQuery(this).addClass('active');

        app.hideAllRows();
        jQuery('#write-screen').removeClass('hidden');
      }
    });

    jQuery('.read-button').click(function() {
      if (app.username) {
        jQuery('.nav-pills li').removeClass('active'); // unmark all nav items
        jQuery(this).addClass('active');

        app.hideAllRows();
        jQuery('#read-screen').removeClass('hidden');
      }
    });

    jQuery('.teacher-button').click(function() {
      if (app.username) {
        jQuery('.nav-pills li').removeClass('active'); // unmark all nav items
        jQuery(this).addClass('active');

        app.hideAllRows();
        jQuery('#teacher-screen').removeClass('hidden');
      }
    });


    // var noteTypeButtons = _.template(jQuery('#choose-new-note-type').text(), {});
    // // popover activation for buttons
    // var popoverOptions = {
    //   'title': "A Title",
    //   'content': noteTypeButtons,
    //   'html': true,
    //   placement: 'bottom'
    // };
    // jQuery('.new-note-btn').popover(popoverOptions);

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

        // hideLogin();
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

  app.loginGroup = function (groupname) {
    // retrieve group with given username
    app.rollcall.group(groupname)
    .done(function (group) {
      if (group) {
        console.log(group.toJSON());

        app.username = group.get('groupname');

        jQuery.cookie('hunger-games_mobile_username', app.username, { expires: 1, path: '/' });
        jQuery('.username-display a').text(app.runId+' - '+group.get('display_name'));

        // show notes-screen
        jQuery('#notes-screen').removeClass('hidden');

        // hideLogin();
        hideUserLoginPicker();
        jQuery('#create-group').modal('hide');
        showUsername();

        app.setup();
      } else {
        console.log('User '+groupname+' not found!');
        if (confirm('User '+groupname+' not found! Do you want to create the user to continue?')) {
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
      // showUserLoginPicker(app.runId);
      showGroupLoginPicker(app.runId);
    });

    // show modal dialog
    jQuery('#login-picker').modal({backdrop: 'static'});
  };

  var showUserLoginPicker = function(runId) {
    // change header
    jQuery('#login-picker .modal-header h3').text('Please login with your squirrel ID');

    // retrieve all users that have runId
    app.rollcall.usersWithRuns([runId])
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

  var showGroupLoginPicker = function(runId) {
    // change header
    jQuery('#login-picker .modal-header h3').text('Please login with your group name');

    // click listener for create new group button
    jQuery('#login-picker .modal-footer button').click(function (ev){
      showGroupCreateDialog(runId);
    });

    // display create group button
    jQuery('#login-picker .modal-footer').css("display", '');

    // retrieve all users that have runId
    app.rollcall.groupsWithRuns([runId])
    .done(function (availableGroups) {
      jQuery('.login-buttons').html(''); //clear the house
      console.log(availableGroups);
      app.groups = availableGroups;

      // sort the collection by username
      app.groups.comparator = function(model) {
        return model.get('groupname');
      };
      app.groups.sort();

      app.groups.each(function(group) {
        var button = jQuery('<button class="btn btn-large btn-primary login-button">');
        button.val(group.get('groupname'));
        button.text(group.get('display_name'));
        jQuery('.login-buttons').append(button);
      });

      // register click listeners
      jQuery('.login-button').click(function() {
        var clickedGroupName = jQuery(this).val();
        app.loginGroup(clickedGroupName);
      });

      // show modal dialog
      // jQuery('#login-picker').modal({backdrop: 'static'});
    });
  };

  var showGroupCreateDialog = function(runId) {
    // change header
    jQuery('#create-group .modal-header h3').text('Please pick team members and provide a group name');

    // click listener for create new group button
    // jQuery('#create_group .modal-footer button').click(function (ev){
    //   jQuery('#create-group').modal({backdrop: 'static'});
    // });

    // display create group button
    // jQuery('#login-picker .modal-footer').css("display", '');

    // retrieve all users that have runId
    app.rollcall.usersWithRuns([runId])
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
        jQuery(this).toggleClass('btn-primary btn-warning');
        // var clickedUserName = jQuery(this).val();
        // app.loginUser(clickedUserName);
      });

      // show modal dialog
      jQuery('#create-group').modal({backdrop: 'static'});

      //submit
      jQuery('.create-new-group').on('click', function(){
        // var newGroup = new app.rollcall.Group();
        var newGroup = {};

        //add value to groups array
        newGroup.users = jQuery.map(jQuery('.btn-warning'), function(item, index){
          return jQuery(item).val();
        });

        newGroup.display_name = jQuery('.create-new-group-name').val();

        if (newGroup.display_name.length > 3 && newGroup.users.length >= 1) {
          // Get value of new group name, to lowercase and strip whitespace
          newGroup.groupname = jQuery('.create-new-group-name').val().replace(/\s/g, '').toLowerCase();
          newGroup.runs = [runId];
          // newGroup.set('created_at', new Date());

          // newGroup.save().done(function(){
          //   console.log('groups saved');
          // });
          createOrUpdateGroup(newGroup);
        } else {
          console.warn('Group name must be more than 3 characters and must contain 1 or more members.');
          jQuery().toastmessage('showErrorToast', "Group name must be more than 3 characters and must contain 1 or more members.");
        }
      });
    });
  };


  var createOrUpdateGroup = function (groupObject) {
    console.log('create group function');
    // does group for users already exist?
    app.rollcall.groupExists(groupObject.groupname)
    .done(function(exists){
      if (exists) {
        // update group
        app.rollcall.group(groupObject.groupname)
        .done(function (group) {
          console.log('Update group: '+group);
          _.map(groupObject, function(val, key) {
            group.set(key, val);
          });
          group.save().done(function(g){
            app.loginGroup(g.groupname);
          });
        });
      } else {
        groupObject.created_at = new Date();
        var newGroup = new app.rollcall.Group(groupObject);
        newGroup.save().done(function(g){
          app.loginGroup(g.groupname);
        });
      }
    });
  };


  app.hideAllRows = function () {
    jQuery('.row-fluid').each(function (){
      jQuery(this).addClass('hidden');
    });
  };


  app.autoSave = function(model, inputKey, inputValue, instantSave) {
    app.keyCount++;
    //console.log("  saving stuff as we go at", app.keyCount);

    // if (model.kind === 'buildOn') {
    //   if (instantSave || app.keyCount > 9) {
    //     // save to buildOn model to stay current with view
    //     // app.buildOn = inputValue;
    //     // save to contribution model so that it actually saves
    //     // var buildOnArray = app.contribution.get('build_ons');
    //     // var buildOnToUpdate = _.find(buildOnArray, function(b) {
    //     //   return b.author === app.userData.account.login && b.published === false;
    //     // });
    //     // buildOnToUpdate.content = inputValue;
    //     // app.contribution.set('build_ons',buildOnArray);
    //     // app.contribution.save(null, {silent:true});
    //     // app.keyCount = 0;
    //   }
    // } else {
      if (instantSave || app.keyCount > 9) {
        console.log('Saved');
        var inputBody = model.get('body');
        inputBody[inputKey] = inputValue;
        model.set('body', inputBody);
        model.save(null, {silent:true});
        app.keyCount = 0;
      }
    //}
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


  this.Skeletor = Skeletor;

}).call(this);
