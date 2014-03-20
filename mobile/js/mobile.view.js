/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function() {
  "use strict";
  var HG = this.HG || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.View = {};


  /**
    InputView
  **/
  app.View.InputView = Backbone.View.extend({
    view: this,

    initialize: function() {
      var view = this;
      console.log('Initializing InputView...', view.el);
    },

    events: {
      'click #share-note-btn': 'shareNote',
      'click .note-body': 'createOrRestoreNote',
      'keyup :input': function(ev) {
        var view = this,
          field = ev.target.name,
          input = ev.target.value;
        // clear timer on keyup so that a save doesn't happen while typing
        window.clearTimeout(app.autoSaveTimer);

        // save after 10 keystrokes
        app.autoSave(app.currentNote, field, input, false);

        // setting up a timer so that if we stop typing we save stuff after 5 seconds
        app.autoSaveTimer = setTimeout(function(){
          app.autoSave(app.currentNote, field, input, true);
        }, 5000);
      }
    },

    createOrRestoreNote: function(ev) {
      // alert('createNewNote: want me to do stuff, teach me');
      var view = this;

      var noteToRestore = view.collection.findWhere({author: app.username, published: false});
      if (noteToRestore) {
        app.currentNote = noteToRestore;
        this.$el.find('.note-body').val(app.currentNote.get('body'));
      } else {
        // no unpublished note, so we create a new note
        var note = {};
        note.author = app.username;
        note.created_at = new Date();
        note.body = '';
        note.published = false;

        app.addNote(note);
      }
    },

    shareNote: function() {
      console.log('want me to do stuff, teach me');

      app.currentNote.set('body', this.$el.find('.note-body').val());
      app.currentNote.set('published', true);

      app.currentNote.save();

      // clearing up
      this.$el.find('.note-body').val('');
      app.currentNote = null;
    },

    // autosaveNote: function(ev) {
    //   var field = ev.target.name,
    //       input = jQuery('#'+ev.target.id).val();
    //   // clear timer on keyup so that a save doesn't happen while typing
    //   window.clearTimeout(app.autoSaveTimer);

    //   // save after 10 keystrokes
    //   app.autoSave(view.model, field, input, false);

    //   // setting up a timer so that if we stop typing we save stuff after 5 seconds
    //   app.autoSaveTimer = setTimeout(function(){
    //     app.autoSave(view.model, field, input, true);
    //   }, 5000);
    // },

    render: function () {
      console.log('Rendering InputView...');
    }
  });


  /**
    ListView
  **/
  app.View.ListView = Backbone.View.extend({
    template: "#notes-list-template",

    initialize: function () {
      var view = this;
      console.log('Initializing ListView...', view.el);

      view.collection.on('change', function(n) {
        view.render();
      });

      view.collection.on('add', function(n) {
        view.render();
      });

      view.render();

      return view;
    },

    events: {
      // nothing here yet, but could be click events on list items to have actions (delete, response and so forth)
    },

    render: function () {
      var view = this;
      console.log("Rendering ListView");

      // find the list where items are rendered into
      var list = this.$el.find('ul');

      // Only want to show published notes at some point
      var publishedNotes = view.collection.where({published: true});

      _.each(publishedNotes, function(note){
        var me_or_others = 'others';
        if (note.get('author') === app.username) {
          me_or_others = 'me';
        }
        var listItem = _.template(jQuery(view.template).text(), {'id': note.id, 'text': note.get('body'), 'me_or_others': me_or_others, 'author': note.get('author'), 'created_at': note.get('created_at')});

        var existingNote = list.find("[data-id='" + note.id + "']");

        if (existingNote.length === 0) {
          list.append(listItem);
        } else {
          existingNote.replaceWith(listItem);
        }
      });

    }

  });

  this.HG = HG;
}).call(this);
