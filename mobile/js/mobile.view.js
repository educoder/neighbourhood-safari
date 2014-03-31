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
  app.View.WriteView = Backbone.View.extend({
    view: this,
    template: "#resume-unpublished-notes",
    simpleNoteInputTemplate: "#simple-note-input",
    planningNoteInputTemplate: "#planning-note-input",

    initialize: function() {
      var view = this;
      console.log('Initializing InputView...', view.el);
    },

    events: {
      'click .resume-note-btn'   : "resumeNote",
      'click .new-note-btn'      : 'pickNewNoteType',
      'click .modal-select-note' : 'selectNoteToResume',
      'click .cancel-note-btn'   : 'cancelNote',
      'click .share-note-btn'    : 'shareNote',
      //'click .note-body'         : 'createOrRestoreNote',
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

    resumeNote: function(){
      var view = this;

      // retrieve unpublished notes of user
      var notesToRestore = view.collection.where({author: app.username, published: false});

      // fill the modal
      jQuery('#select-note-modal').html('');
      _.each(notesToRestore, function(note){
        var option = _.template(jQuery(view.template).text(), {'option_text': note.get('body'), id: note.id});
        jQuery('#select-note-modal').append(option);
      });

      //show modal
      console.log('Show modal to pick previous note.');
      jQuery('.unpublished-note-picker').modal('show');
    },

    pickNewNoteType: function(ev) {
      var view = this;
      console.log('Picking type of new note');

      // register click listeners on all note picking buttons in modal
      jQuery('.note-type-picker button').on('click', function(ev) {
        console.log('New note of type: '+ev.target.value);
        view.showNewNote(ev.target.value);
      });

      // show modal with note type picking buttons
      jQuery('.note-type-picker').modal('show');
    },

    showNewNote: function(note_type) {
      var view = this;
      console.log('Starting new note.');

      // create an note object
      var note = {};
      note.author = app.username;
      note.created_at = new Date();
      note.body = '';
      note.published = false;

      // make note wakeful and add it to notes collection
      app.addNote(note);

      var noteInput = null;
      // render the note input fields depending on note type
      if (note_type === "open_note") {
        noteInput = _.template(jQuery(view.simpleNoteInputTemplate).text(), {});
      } else if (note_type === "planning_note") {
        noteInput = _.template(jQuery(view.planningNoteInputTemplate).text(), {});
      } else if (note_type === "open_note") {
        noteInput = _.template(jQuery(view.planningNoteInputTemplate).text(), {});
      } else if (note_type === "open_note") {
        noteInput = _.template(jQuery(view.planningNoteInputTemplate).text(), {});
      } else {
        noteInput = null;
        throw "This should never happen";
      }

      // Add note input field html into div
      view.$el.find('.note-taking-toggle-input-form').html(noteInput);

      // Clear text input field
      view.$el.find('.note-body').val('');

      // hide modal
      jQuery('.note-type-picker').modal('hide');

      jQuery('.note-taking-toggle').slideDown();
      jQuery('.resume-note-btn, .new-note-btn').attr('disabled', 'disabled');
    },

    cancelNote: function() {
      console.log("Cancelling note and hiding textarea.");
      // cancel auto save
      window.clearTimeout(app.autoSaveTimer);
      // unset note
      app.currentNote = null;
      // Hide textarea
      jQuery('.note-taking-toggle').slideUp();
      jQuery('.resume-note-btn, .new-note-btn').removeAttr('disabled', 'disabled');
    },

    selectNoteToResume: function(ev){
      var view = this;
      console.log('Select a note.');

      var selectedOption = jQuery('#select-note-modal').find(":selected");
      // children()[jQuery('#select-note-modal').index()];
      // retrieve id of selectd note
      var selectedNoteId = jQuery(selectedOption).data('id');
      app.currentNote = view.collection.findWhere({_id: selectedNoteId});

      // Clear text input field
      this.$el.find('.note-body').val('');

      this.$el.find('.note-body').val(app.currentNote.get('body'));

      jQuery('.unpublished-note-picker').modal('hide');
      jQuery('.note-taking-toggle').slideDown();
      jQuery('.resume-note-btn, .new-note-btn').attr('disabled', 'disabled');
    },

    // createOrRestoreNote: function(ev) {
    //   // alert('createNewNote: want me to do stuff, teach me');
    //   var view = this;

    //   var noteToRestore = view.collection.findWhere({author: app.username, published: false});
    //   if (noteToRestore) {
    //     app.currentNote = noteToRestore;
    //     this.$el.find('.note-body').val(app.currentNote.get('body'));
    //   } else {
    //     // no unpublished note, so we create a new note
    //     var note = {};
    //     note.author = app.username;
    //     note.created_at = new Date();
    //     note.body = '';
    //     note.published = false;

    //     app.addNote(note);
    //   }
    // },

    shareNote: function() {
      console.log('want me to do stuff, teach me');

      app.currentNote.set('body', this.$el.find('.note-body').val());
      app.currentNote.set('published', true);

      app.currentNote.save();

      // clearing up
      this.$el.find('.note-body').val('');
      // turn off auto save
      window.clearTimeout(app.autoSaveTimer);
      app.currentNote = null;
      jQuery('.note-taking-toggle').slideUp();
      jQuery('.resume-note-btn, .new-note-btn').removeAttr('disabled', 'disabled');
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
  app.View.ReadView = Backbone.View.extend({
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
      'click .filter-notes': 'filterNotes',
      'click .clear-notes': 'clearNotes'
    },

    filterNotes: function(){
      jQuery('.filter-notes-modal').modal('show');
    },

    clearNotes: function(){
      // Trigger some sort of query
      alert('Clearing Fitlers');
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
        // add class 'me' or 'other' to note
        if (note.get('author') === app.username) {
          me_or_others = 'me';
        }

        //
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
