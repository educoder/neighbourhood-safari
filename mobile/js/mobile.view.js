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
      'click .note-entry-field': 'createNewNote'
    },

    createNewNote: function(ev) {
      alert('createNewNote: want me to do stuff, teach me');
      // var view = this;
      // view.updateEllipses(ev);

      // if (app.currentNote === null) {
      //   var note = {};
      //   note.author = app.username;
      //   note.part_1 = this.$el.find('#note-part-1-entry').val();
      //   note.part_2 = this.$el.find('#note-part-2-entry').val();
      //   note.related_activity = this.$el.find('#activity-dropdown').val();
      //   note.created_at = new Date();
      //   note.published = false;
      //   note.worth_remembering = false;

      //   app.addNote(note);
      // }
    },

    shareNote: function() {
      console.log('want me to do stuff, teach me');

      var note = {};
      note.text = this.$el.find('.note-text').val();
      note.author = app.username;
      note.created_at = new Date();

      app.addNote(note);
    },

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

      view.collection.each(function(note){
        var existingNote = list.find("[data-id='" + note.id + "']");

        if (existingNote.length === 0) {
          // var existingNote = jQuery(list).find("[data-id='" + 111 + "']");
          var me_or_others = 'others';
          if (note.get('author') === app.username) {
            me_or_others = 'me';
          }

          var listItem = _.template(jQuery(view.template).text(), {'id': note.id, 'text': note.get('text'), 'me_or_others': me_or_others, 'author': note.get('author'), 'created_at': note.get('created_at')});
          list.append(listItem);
        }
      });

    }

  });

  this.HG = HG;
}).call(this);
