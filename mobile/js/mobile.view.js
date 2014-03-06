/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function() {
  "use strict";
  var HG = this.HG || {};
  this.HG.Mobile = this.HG.Mobile || {};
  var app = this.HG.Mobile;
  app.View = {};

  /**
    MobileView
  **/
  // app.View.IndexView = Backbone.View.extend({
  //   events: {
  //     'keyup :input': function(ev) {
  //       var view = this,
  //         field = ev.target.name,
  //         input = jQuery('#'+ev.target.id).val();
  //       // clear timer on keyup so that a save doesn't happen while typing
  //       window.clearTimeout(app.autoSaveTimer);

  //       // save after 10 keystrokes
  //       app.autoSave(view.model, field, input, false);

  //       // setting up a timer so that if we stop typing we save stuff after 5 seconds
  //       app.autoSaveTimer = setTimeout(function(){
  //         app.autoSave(view.model, field, input, true);
  //       }, 5000);
  //     }
  //   },

  //   initialize: function () {
  //     console.log("Initializing IndexView...",this.el);
  //   }
  // });


  /**
    InputView
  **/
  app.View.InputView = Backbone.View.extend({
    view: this,

    initialize: function() {
      var view = this;
      console.log('Initializing InputView...', view.el);
      view.populateActivityDropdown();
      view.updateActivity();
    },

    events: {
      'click #share-note-btn': 'shareNote',
      'click .note-entry-field': 'createNewNote',
      'change #activity-dropdown': 'updateActivity',
      'keyup :input': function(ev) {
        var view = this,
          field = ev.target.name,
          input = jQuery('#'+ev.target.id).val();
        // clear timer on keyup so that a save doesn't happen while typing
        window.clearTimeout(app.autoSaveTimer);
        // save after 10 keystrokes
        app.autoSave(field, input, false);
        // setting up a timer so that if we stop typing we save stuff after 5 seconds
        app.autoSaveTimer = setTimeout(function() {
          if (app.currentNote) {
            app.autoSave(field, input, true);
          }
        }, 5000);
      }
    },

    createNewNote: function(ev) {
      var view = this;
      view.updateEllipses(ev);

      if (app.currentNote === null) {
        var note = {};
        note.author = app.username;
        note.part_1 = this.$el.find('#note-part-1-entry').val();
        note.part_2 = this.$el.find('#note-part-2-entry').val();
        note.related_activity = this.$el.find('#activity-dropdown').val();
        note.created_at = new Date();
        note.published = false;
        note.worth_remembering = false;

        app.addNote(note);
      }
    },

    shareNote: function() {
      var view = this;
      var p1 = this.$el.find('#note-part-1-entry').val();
      var p2 = this.$el.find('#note-part-2-entry').val();
      if (p1.slice(-3) !== "..." && p2.slice(-3) !== "...") {
        // var newP1 = HG.Mobile.turnUrlsToLinks(p1);
        app.currentNote.set('part_1', p1);
        app.currentNote.set('part_2', p2);
        app.currentNote.set('published', true);

        app.saveCurrentNote();

        view.updateActivity();       
      } else {
        jQuery().toastmessage('showErrorToast', "Please fill out both parts of the note");
      }
    },

    updateEllipses: function(ev) {
      var str = jQuery(ev.target).val();
      if (str.slice(-3) === "...") {
        jQuery(ev.target).val(str.substring(0, str.length - 3) + " ");
      }
    },

    populateActivityDropdown: function () {
      if (app.activityDropdownData || app.activityDropdownData.length >= 0) {
        var dropdown = jQuery('#activity-dropdown');
        dropdown.html(''); // clearing out the html
        _.each(app.activityDropdownData, function(a) {
          var option = jQuery('<option>');
          option.attr('value', 'activity-'+a._id);
          option.text(a.title);
          dropdown.append(option);
        });
      } else {
        console.log('No state date, so no dropdown ...');
      }
    },

    updateActivity: function() {
      var view = this;
      var activity = jQuery('#activity-dropdown').val();
      var activityId = parseInt(activity.substring(9, activity.length), 10);
      // if there's a note to restore, do it
      if (app.restoreLastNote(activity)) {
        this.$el.find('#note-part-1-entry').val(app.currentNote.get('part_1'));
        this.$el.find('#note-part-2-entry').val(app.currentNote.get('part_2'));
      } else {
        // dropdown and prompt UI
        var selectedActivityData = _.findWhere(app.activityDropdownData, {"_id": activityId});
        
        jQuery('#note-part-1-entry').val(selectedActivityData.prompt1);
        jQuery('#note-part-2-entry').val(selectedActivityData.prompt2);
      }
      // view.render();
    },

    render: function () {
      console.log('Rendering InputView...');

      // if (app.currentNote) {
      //   this.$el.find('#note-part-1-entry').val(app.currentNote.get('part_1'));
      //   this.$el.find('#note-part-2-entry').val(app.currentNote.get('part_2'));
      // } else {
      //   // dropdown and prompt UI
      //   var activity = jQuery('#activity-dropdown').val();
      //   if (activity === "activity-1") {
      //     jQuery('#note-part-1-entry').val("The strategy I tended to use was...");
      //     jQuery('#note-part-2-entry').val("In order to do better next time I will...");
      //   } else if (activity === "activity-2") {
      //     jQuery('#note-part-1-entry').val("Compared to an ideal distribution, our results were...");
      //     jQuery('#note-part-2-entry').val("This was because...");
      //   } else {
      //     jQuery('#note-part-1-entry').val("");
      //     jQuery('#note-part-2-entry').val("");
      //   }
      // }

    }
  });


  /**
    ListView
  **/
  app.View.ListView = Backbone.View.extend({
    template: "#list-view-template",
    replyTemplate: "#reply-view-template",

    initialize: function () {
      var view = this;

      console.log('Initializing ListView...', view.el);

      HG.Model.awake.notes.on('change', function(n) {
        console.log('Note changed...');
        // only render (ie show the note) if it's published (so the list won't be constantly getting refreshed)
        if (n.get('published') === true && n.get('worth_remembering') === false) {
          view.render();
        }
      });

      jQuery('#activity-dropdown').on('change', function() {
        console.log('Dropdown changed...');
        view.render();
      });

      view.render();

      return view;
    },

    events: {
      'click .create-reply-btn': function(ev) {
        jQuery('#list-screen .reply-entry').addClass('hidden');
        // removing hidden class from sibling element (ie show the reply text entry box)
        jQuery(ev.target).parent().siblings().removeClass('hidden');       // lovely!
        var relatedNoteId = jQuery(ev.target).parent().attr('id').slice(8);
        app.createReply(relatedNoteId);
      },

      'click .submit-reply-btn': function(ev) {
        var replyText = jQuery(ev.target).prev().val();
        if (replyText !== '') {
          console.log("Attaching and saving reply...");
          // grab the reply content from the text field
          app.saveCurrentReply(replyText);
          jQuery('#list-screen .reply-text-entry').val('');
          jQuery('#list-screen .reply-entry').addClass('hidden');          
        } else {
          jQuery().toastmessage('showErrorToast', "Cannot submit empty replies");
        }
      }
    },

    render: function () {
      var view = this;
      console.log("Rendering ListView");

      // find the list where items are rendered into
      var list = this.$el.find('ul');

      // this is a hacky way of preventing the list from rerendering if the user is currently replying
      var replyOpenFlag = false;
      jQuery('#list-screen .reply-entry').each(function() {
        if (jQuery(this).hasClass('hidden')) {
          console.log('Not open');
        } else {
          replyOpenFlag = true;
        }
      });
      if (replyOpenFlag === false) {
        list.html('');
        // only display notes from the selected activity, that are published, etc
        var filteredList = HG.Model.awake.notes.where({related_activity:jQuery('#activity-dropdown').val(), published:true, worth_remembering:false});
        // TODO: switch to comparator method
        var sortedList = _.sortBy(filteredList, function(n) {
          return -n.get('created_at');
        });

        _.each(sortedList, function(n) {
          // TODO: fix the ordering issue! Likely easiest to change remove() to html('') and keep the id? With an if in the append?
          // if (replyOpenFlag === false && (n.hasChanged() || jQuery('#note-id-' + n.id).length === 0)) {
          //   // if this n has changed
          //   jQuery('#note-id-' + n.id).remove();
          // } else {
          //   // else break out
          //   return;
          // }

          if (n.get('part_1') && n.get('part_2') && n.get('author')) {
            console.log('Showing each note...');
            var data = n.toJSON();
            data.color = app.users.findWhere({username:n.get('author')}).get('color');

            if (app.users.findWhere({'username':n.get('author')}).isTeacher()) {
              data.author = '*T*';
            } else {
              data.author = n.get('author').toUpperCase();
            }

            var listItem = _.template(jQuery(view.template).text(), data);
            list.append(listItem);

            // these selectors are pretty awkward... are we still really liking templates? Is there some DOM ev.target/this/iterator type thing I can grab?
            // jQuery('#list-screen li:nth-last-child(1) .note').attr('id','note-id-'+n.get('_id'));
            // update the colors of the author box
            // var color = app.users.findWhere({username:n.get('author')}).get('color');
            // var authorContainer = jQuery('#list-screen li:nth-last-child(1) .author-container');
            // authorContainer.css('background-color', color);
            // set teacher user to *T* (check this with TOM) - see also replies
            // if (app.users.findWhere({'username':n.get('author')}).isTeacher()) {
            //   authorContainer.children().text('*T*');
            // } else {
            //   authorContainer.children().text(n.get('author').toUpperCase());
            // }

            // if there are buildOns/replies
            if (n.get('build_ons')) {
              // determine the DOM element that we'll start adding the templated items to
              var el = jQuery('#list-screen li:nth-last-child(1)');
              // each through the replies
              _.each(n.get('build_ons'), function(r) {
                // attach them to the list item or preceeding item
                var replyItem = _.template(jQuery(view.replyTemplate).text(), r);
                el.append(replyItem);
                // add the author color
                var c = app.users.findWhere({username:r.author}).get('color');
                var replyAuthorContainer = jQuery('#list-screen li:nth-last-child(1) ').children().last().children().first();
                replyAuthorContainer.css('background-color', c);
                // set teacher user to *T* else uppercase the users
                if (app.users.findWhere({'username':r.author}).isTeacher()) {
                  replyAuthorContainer.children().text('*T*');
                } else {
                  replyAuthorContainer.children().text(r.author.toUpperCase());
                }
              });
            }
          } else {
            console.warn("Malformed note...");
          }
        });
      }



        // case 1: new note
        // if (jQuery('#note-id-' + n.id).length === 0) {
        //   if (n.get('part_1') && n.get('part_2') && n.get('author') && (n.get('published') === true)) {
        //     // only display notes from the selected activity
        //     if (n.get('related_activity') === jQuery('#activity-dropdown').val()) {
        //       console.log('Showing each note...');
        //       var data = n.toJSON();

        //       var listItem = _.template(jQuery(view.template).text(), data);
        //       list.append(listItem);

        //       // these selectors are pretty awkward... are we still really liking templates? Is there some DOM ev.target/this/iterator type thing I can grab?
        //       jQuery('#list-screen li:nth-last-child(1) .note').attr('id','note-id-'+n.get('_id'));
        //       // update the colors of the author box
        //       var color = app.users.findWhere({username:n.get('author')}).get('color');
        //       jQuery('#list-screen li:nth-last-child(1) .author-container').css('background-color', color);

        //       // if there are buildOns/replies
        //       if (n.get('build_ons')) {
        //         // determine the DOM element that we'll start adding the templated items to
        //         var el = jQuery('#list-screen li:nth-last-child(1)');
        //         // each through the replies
        //         _.each(n.get('build_ons'), function(r) {
        //           // attach them to the list item or preceeding item
        //           var replyItem = _.template(jQuery(view.replyTemplate).text(), r);
        //           el.append(replyItem);
        //           // add the author color
        //           var c = app.users.findWhere({username:r.author}).get('color');
        //           jQuery('#list-screen li:nth-last-child(1) ').children().last().children().first().css('background-color', c);
        //         });
        //       }
        //     }
        //   } else {
        //     console.warn("Malformed note...");
        //   }
        // }

        // // case 2: note has changed (ie reply added)
        // else if (n.hasChanged()) {
        //   // this can be assumed, right?
        //   if (n.get('build_ons')) {
        //     // remove all replies (but leave the reply-entry)
        //     // jQuery('#note-id-' + n.id).siblings().each(function() {
        //     //   if (jQuery(this).hasClass('reply')) {
        //     //     jQuery(this).remove();
        //     //   }
        //     // });

        //     var el = jQuery('#note-id-' + n.id).siblings().last();
        //     _.each(n.get('build_ons'), function(r) {
        //       // attach them to the list item or preceeding item
        //       var replyItem = _.template(jQuery(view.replyTemplate).text(), r);
        //       el.append(replyItem);
        //       // add the author color
        //       // var c = app.users.findWhere({username:r.author}).get('color');       // check me!!
        //       // jQuery('#list-screen li:nth-last-child(1) ').children().last().children().first().css('background-color', c);
        //     });
        //   }



        //   // if (n.get('build_ons')) {
        //   //   // determine the DOM element that we'll start adding the templated items to
        //   //   var el = jQuery('#list-screen li:nth-last-child(1)');    // do we need to clear it out first?
        //   //   // each through the replies
        //   //   _.each(n.get('build_ons'), function(r) {
        //   //     // attach them to the list item or preceeding item
        //   //     var replyItem = _.template(jQuery(view.replyTemplate).text(), r);
        //   //     el.append(replyItem);
        //   //     // add the author color
        //   //     var c = app.users.findWhere({username:r.author}).get('color');       // check me!!
        //   //     jQuery('#list-screen li:nth-last-child(1) ').children().last().children().first().css('background-color', c);
        //   //   });
        //   //}
        // }

        // // case 3: else skip this note
        // else {
        //   return;
        // }
    }

  });


  /**
    WRInputView
  **/
  app.View.WorthRememberingInputView = Backbone.View.extend({
    initialize: function() {
      var view = this;
      console.log('Initializing WorthRememberingInputView...', this.el);
      if (app.users.findWhere({'username':app.username}).isTeacher()) {
        console.log('Hey there teacher');
        this.$el.find('#share-worth-remembering-btn').removeClass('hidden');
        this.$el.find('#worth-remembering-entry').removeClass('hidden');
      } else {
        console.log('No button for you!');
        this.$el.find('#share-worth-remembering-btn').addClass('hidden');
        this.$el.find('#worth-remembering-entry').addClass('hidden');
      }
      view.tryRestore();
    },

    events: {
      'click #share-worth-remembering-btn': 'shareNote',
      'click .worth-remembering-entry-field': 'createNewNote',
      'keyup :input': function(ev) {
        var view = this,
          field = ev.target.name,
          input = jQuery('#'+ev.target.id).val();
        // clear timer on keyup so that a save doesn't happen while typing
        window.clearTimeout(app.autoSaveTimer);
        // save after 10 keystrokes
        app.autoSave(field, input, false);
        // setting up a timer so that if we stop typing we save stuff after 5 seconds
        app.autoSaveTimer = setTimeout(function() {
          if (app.currentWorthRemembering) {
            app.autoSave(field, input, true);
          }
        }, 5000);
      }
    },

    createNewNote: function() {
      var view = this;

      if (app.currentWorthRemembering === null) {
        var note = {};
        note.author = app.username;
        note.part_1 = this.$el.find('#worth-remembering-entry').val();
        note.created_at = new Date();
        note.worth_remembering = true;
        note.published = false;

        app.createWorthRemembering(note);
      }
    },

    shareNote: function() {
      var view = this;
      var w = this.$el.find('#worth-remembering-entry').val();
      // because jquery disabled doesn't disable the click event
      if (app.users.findWhere({'username':app.username}).isTeacher()) {
        if (w !== '') {
          app.currentWorthRemembering.set('part_1', w);
          app.currentWorthRemembering.set('published', true);

          app.saveCurrentWorthRemembering();

          view.tryRestore();       
        } else {
          jQuery().toastmessage('showErrorToast', "Note is blank!");
        }        
      }
    },

    tryRestore: function() {
      var view = this;
      // if there's a wr to restore, do it
      app.restoreWorthRemembering();
      view.render();
    },

    render: function () {
      console.log('Rendering WothRememberingInputView...');

      if (app.currentWorthRemembering) {
        this.$el.find('#worth-remembering-entry').val(app.currentWorthRemembering.get('part_1'));
      }
    }
  });


  /**
    WRListView
  **/
  app.View.WorthRememberingListView = Backbone.View.extend({
    template: "#list-view-template",
    replyTemplate: "#reply-view-template",

    initialize: function () {
      var view = this;

      console.log('Initializing WorthRememberingListView...', view.el);

      HG.Model.awake.notes.on('change', function(n) {
        console.log('Note changed...');
        // only render (ie show the note) if it's published (so the list won't be constantly getting refreshed)
        if (n.get('published') === true && n.get('worth_remembering') === true) {
          view.render();
        }
      });

      view.render();

      return view;
    },

    events: {
      'click .create-reply-btn': function(ev) {
        jQuery('#worth-remembering-list-screen .reply-entry').addClass('hidden');
        // removing hidden class from sibling element (ie show the reply text entry box)
        jQuery(ev.target).parent().siblings().removeClass('hidden');       // lovely!
        var relatedNoteId = jQuery(ev.target).parent().attr('id').slice(8);
        app.createReply(relatedNoteId);
      },

      'click .submit-reply-btn': function(ev) {
        var replyText = jQuery(ev.target).prev().val();
        if (replyText !== '') {
          console.log("Attaching and saving reply...");
          // grab the reply content from the text field
          app.saveCurrentReply(replyText);
          jQuery('#worth-remembering-list-screen .reply-text-entry').val('');
          jQuery('#worth-remembering-list-screen .reply-entry').addClass('hidden');          
        } else {
          jQuery().toastmessage('showErrorToast', "Cannot submit empty replies");
        }
      }
    },

    render: function () {
      var view = this;
      console.log("Rendering WorthRememberingListView");

      // find the list where items are rendered into
      var list = this.$el.find('ul');

      // this is a hacky way of preventing the list from rerendering if the user is currently replying
      var replyOpenFlag = false;
      jQuery('#worth-remembering-list-screen .reply-entry').each(function() {
        if (jQuery(this).hasClass('hidden')) {
          console.log('Not open');
        } else {
          replyOpenFlag = true;
        }
      });
      if (replyOpenFlag === false) {
        list.html('');
        // only display notes that are published, etc
        var filteredList = HG.Model.awake.notes.where({published:true, worth_remembering:true});
        // TODO: switch to comparator method
        var sortedList = _.sortBy(filteredList, function(n) {
          return -n.get('created_at');
        });

        _.each(sortedList, function(n) {
          if (n.get('part_1') && n.get('author')) {
            console.log('Showing each note...');
            n.set('part_2', ' ');                   // this ugliness is so that we can reuse the same templates as with notes (there must be a part_2 or _.template check on the data)

            var data = n.toJSON();
            data.color = app.users.findWhere({username:n.get('author')}).get('color');

            if (app.users.findWhere({'username':n.get('author')}).isTeacher()) {
              data.author = '*T*';
            } else {
              data.author = n.get('author').toUpperCase();
            }

            var listItem = _.template(jQuery(view.template).text(), data);
            list.append(listItem);

            // used for linking up replies
            // jQuery('#worth-remembering-list-screen li:nth-last-child(1) .note').attr('id','worth-remembering-id-'+n.get('_id'));
            // update the colors of the author box
            // var color = app.users.findWhere({username:n.get('author')}).get('color');
            // var authorContainer = jQuery('#worth-remembering-list-screen li:nth-last-child(1) .author-container');
            // authorContainer.css('background-color', color);
            // set teacher user to *T* else username to uppercase
            // if (app.users.findWhere({'username':n.get('author')}).isTeacher()) {
            //   authorContainer.children().text('*T*');
            // } else {
            //   authorContainer.children().text(n.get('author').toUpperCase());
            // }

            // if there are buildOns/replies
            if (n.get('build_ons')) {
              // determine the DOM element that we'll start adding the templated items to
              var el = jQuery('#worth-remembering-list-screen li:nth-last-child(1)');
              // each through the replies
              _.each(n.get('build_ons'), function(r) {
                // attach them to the list item or preceeding item
                var replyItem = _.template(jQuery(view.replyTemplate).text(), r);
                el.append(replyItem);
                // add the author color
                var c = app.users.findWhere({username:r.author}).get('color');
                var replyAuthorContainer = jQuery('#worth-remembering-list-screen li:nth-last-child(1)').children().last().children().first();
                replyAuthorContainer.css('background-color', c);
                if (app.users.findWhere({'username':r.author}).isTeacher()) {
                  replyAuthorContainer.children().text('*T*');
                } else {
                  replyAuthorContainer.children().text(r.author.toUpperCase());
                }
              });
            }
          } else {
            console.warn("Malformed note...");
          }
        });
      }
    }

  });





  /**
    LoginButtonsView
  **/
  // app.View.LoginButtonsView = Backbone.View.extend({
  //   initialize: function () {
  //     console.log('Initializing LoginButtonsView...', this.el);
  //   },

  //   events: {
  //     //'click #share-note-btn': 'shareNewNote'
  //   },

  //   shareNewNote: function () {
  //     // var newHeadline = this.$el.find('#note-headline-entry').val();
  //     // var newNoteText = this.$el.find('#note-body-entry').val();
  //     // var newNote = {};
  //     // newNote.headline = newHeadline;
  //     // newNote.body = newNoteText;
  //     // // if (jQuery.trim(newTag).length < 2) {
  //     // //   return; // don't allow tags shorter than 2 characters
  //     // // }
  //     // HG.Mobile.createNewNote(newNote);
      
  //     // this.$el.find('#note-headline-entry').val('');
  //     // this.$el.find('#note-body-entry').val('');
  //   },

  //   render: function () {
  //     console.log('Rendering LoginButtonsView');
  //   }


  // });


  this.HG = HG;
}).call(this);
