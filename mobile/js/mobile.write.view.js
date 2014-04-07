/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function() {
  "use strict";
  var HG = this.HG || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.View = this.Skeletor.Mobile.View || {};

  /**
    WriteView
  **/
  app.View.WriteView = Backbone.View.extend({
    view: this,
    resumeTemplate: "#resume-unpublished-notes",
    openNoteInputTemplate: "#open-note-input",
    planningNoteInputTemplate: "#planning-note-input",
    photoSetNoteTemplate: "#photo-set-note-input",
    crossCuttingNoteInputTemplate: "#cross-cutting-note-input",
    photoTemplate: "#photo-template",
    tagTemplate: "#tag-template",

    initialize: function() {
      var view = this;
      console.log('Initializing InputView...', view.el);

      view.collection.on('add', function(n) {
        if (!n.get('published') && (n.get('author') === app.username)) {
          view.render();
        }
      });

      view.collection.on('change update', function(n) {
        if (!n.get('published') && (n.get('author') === app.username)) {
          view.render();
        }
      });

      view.collection.on('destroy delete', function(n) {
        // check if event was triggered for a Document/ Model that is published
        // only render if published is set. This should avoid gettting hammered
        if (!n.get('published') && (n.get('author') === app.username)) {
          // this is a quick and easy solution to the rare case
          // that documents in a collection are deleted
          view.$el.find('.note-list').html('');
          view.render();
        }
      });

      view.render();

      // click listeners for dropdown items
      // view.$el.find('.dropdown-menu a').click(function(){
      //   view.selectNoteToResume(jQuery(this).data('id'));
      // });
    },

    events: {
      'click .resume-note-btn'   : "resumeNote",
      'click .new-note-btn'      : 'pickNewNoteType',
      'click .note-type-picker button': 'showNewNote',
      // 'click .modal-select-note' : 'selectNoteToResume',
      'click .dropdown-menu a' : 'selectNoteToResume',
      'click .cancel-note-btn'   : 'cancelNote',
      'click .share-note-btn'    : 'publishNote',
      'click .add-related-camera-traps-btn': 'addCameraTrapNumbers',
      'click .camera-btn'        : 'showPhotoPicker',
      'click .photo'             : 'setSelected',
      'click .photo-picker button': 'addPhotos',
      'click .tag-btn'            : 'showTagPicker',
      'click .tag'                : 'setSelected',
      'click .tag-picker button'  : 'addTags',
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

    resumeNote: function(ev) {
      var view = this;
      console.log("updating resume note list...");

      // this assumes that render does the resume notes list only
      view.render();

      // show the list of notes to resume
      // view.$el.find('.resume-note-btn-group').toggleClass('open');
    },

    // resumeNote: function(){
    //   var view = this;

    //   // retrieve unpublished notes of user
    //   var notesToRestore = view.collection.where({author: app.username, published: false});

    //   // fill the modal
    //   jQuery('#select-note-modal').html('');
    //   _.each(notesToRestore, function(note){
    //     var body = note.get('body');
    //     var option_text = '';
    //     var option = null;
    //     // if there is a header show it
    //     if (body.title && body.title !== '') {
    //       option_text = body.title;
    //     } else {
    //       var firstAttributeFound = _.keys(body)[0];
    //       option_text = body[firstAttributeFound];
    //     }
    //     // truncate and change the attribute :)
    //     if (option_text.length > 20) {
    //       option_text = option_text.substring(0,19);
    //       option_text += '[...]';
    //     }
    //     option = _.template(jQuery(view.template).text(), {'option_text': option_text, id: note.id});
    //     jQuery('#select-note-modal').append(option);
    //   });

    //   //show modal
    //   console.log('Show modal to pick previous note.');
    //   jQuery('.unpublished-note-picker').modal('show');
    // },

    pickNewNoteType: function(ev) {
      var view = this;
      console.log('Picking type of new note');

      // show modal with note type picking buttons
      jQuery('.note-type-picker').modal('show');
    },

    showNewNote: function(ev) {
      var view = this;
      console.log('Starting new note.');

      var note_type = ev.target.value;

      // create an note object
      var note = {
        author: app.username,
        created_at: new Date(),
        type: note_type,
        body: {},
        photos: [],
        tags: [],
        related_camera_traps: [],
        published: false
      };

      // make note wakeful and add it to notes collection
      app.addNote(note);

      var noteInput = null;
      // render the note input fields depending on note type
      if (note_type === "planning") {
        noteInput = _.template(jQuery(view.planningNoteInputTemplate).text(), {});
      } else if (note_type === "photo_set") {
        noteInput = _.template(jQuery(view.photoSetNoteTemplate).text(), {});
      } else if (note_type === "cross_cutting") {
        noteInput = _.template(jQuery(view.crossCuttingNoteInputTemplate).text(), {});
      } else if (note_type === "open") {
        noteInput = _.template(jQuery(view.openNoteInputTemplate).text(), {});
      } else {
        noteInput = null;
        throw "This should never happen";
      }

      // Add note input field html into div
      view.$el.find('.note-taking-toggle-input-form').html(noteInput);

      // Clear input fields
      view.$el.find('textarea').val('');
      jQuery('#notes-screen-input').removeClass('selected');

      // hide modal
      jQuery('.note-type-picker').modal('hide');

      jQuery('.note-taking-toggle').slideDown();

      jQuery('#show-note-container').addClass('hidden');
    },

    setSelected: function(ev) {
      jQuery(ev.target).addClass('selected');
    },

    addCameraTrapNumbers: function(ev) {
      ev.preventDefault();
      var cameraTrap = Number(jQuery('.related-camera-traps-input').val());
      jQuery('.related-camera-traps-input').val("");
      // TODO: maybe check based on the safari counter in the collection that gugo makes instead of arbitrary 999
      if (cameraTrap > 0 && cameraTrap < 999) {
        app.currentNote.get('related_camera_traps').push(cameraTrap);
        // clearing out any duplicates
        app.currentNote.set('related_camera_traps', _.uniq(app.currentNote.get('related_camera_traps')));
        jQuery('.related-camera-traps').text(app.currentNote.get('related_camera_traps'));
      } else {
        jQuery().toastmessage('showErrorToast', "Invalid camera trap number");
      }
    },

    showPhotoPicker: function() {
      var view = this;
      // iterate over this group's photo collection
      var myBackpack = app.backpacks.findWhere({"owner":app.username});
      var photoHTML = "";

      // make sure they have a backpack
      if (myBackpack) {
        _.each(myBackpack.get('content'), function(o) {
          photoHTML += _.template(jQuery(view.photoTemplate).text(), {'url':o.image_url});
        });
        jQuery('.photos-container').html(photoHTML);
        jQuery('.photo-picker').modal('show');
      } else {
        jQuery().toastmessage('showErrorToast', "Sorry, you do not have a backpack yet");
      }
    },

    // TODO: move me to mobile.js?
    addPhotos: function() {
      // clear out all photos previous attached to the note
      app.currentNote.set('photos',[]);
      var photosAr = [];
      // create an array or urls of all of the photos marked as selected
      _.each(jQuery('.photo-picker .selected'), function(el) {
        photosAr.push(jQuery(el).attr('src'));
      });
      // set that array into the currentNote
      app.currentNote.set('photos', photosAr);
      jQuery('.photo-picker').modal('hide');
      jQuery().toastmessage('showSuccessToast', "Photos attached to note");
    },

    showTagPicker: function(ev) {
      ev.preventDefault();
      var view = this;
      var tagsHTML= "";

      // make sure there is a tag collection
      if (app.tags) {
        var tags = app.currentNote.get('tags');
        app.tags.each(function(tag) {
          // check if this note already has this tag
          var matchTag = _.find(tags, function(t) { return t === tag.get('name'); });

          var selectedFlag = "";
          if (matchTag) {
            selectedFlag = "selected";
          }
          // add the selector class if tag is already attached to note
          tagsHTML += _.template(jQuery(view.tagTemplate).text(), {'tagName':tag.get('name'), 'selectedClass':selectedFlag});
        });
        jQuery('.tags-container').html(tagsHTML);
        jQuery('.tag-picker').modal('show');
      } else {
        jQuery().toastmessage('showErrorToast', "There aren't any tags yet!");
      }
    },

    addTags: function() {
      // clear out all tags previous attached to the note
      app.currentNote.set('tags',[]);
      var tagsAr = [];
      // create an array or urls of all of the photos marked as selected
      _.each(jQuery('.tag-picker .selected'), function(el) {
        tagsAr.push(jQuery(el).text());
      });
      // set that array into the currentNote
      app.currentNote.set('tags', tagsAr);
      jQuery('.tag-picker').modal('hide');
      jQuery().toastmessage('showSuccessToast', "Tags attached to note");
    },

    cancelNote: function() {
      var view = this;
      console.log("Cancelling note and hiding textarea.");
      // cancel auto save
      window.clearTimeout(app.autoSaveTimer);

      // if nothing was written we delete the object otherwise just leave
      var changedElementsArray = _.filter(view.$el.find('textarea'), function(textarea){
        return textarea.value !== '';
      });

      // nothing was input so nuke the note away
      if (changedElementsArray.length <= 0) {
        app.currentNote.destroy();
      }

      // unset note
      app.currentNote = null;
      // Hide textarea
      jQuery('.note-taking-toggle').slideUp();
      jQuery('#show-note-container').removeClass('hidden');
    },

    selectNoteToResume: function(ev){
      var view = this;
      console.log('Select a note.');

      var selectedNoteId = jQuery(ev.target).data('id');

      // var selectedOption = jQuery('#select-note-modal').find(":selected");
      // children()[jQuery('#select-note-modal').index()];
      // retrieve id of selectd note
      // var selectedNoteId = jQuery(selectedOption).data('id');
      app.currentNote = view.collection.findWhere({_id: selectedNoteId});

      var note_type = app.currentNote.get('type');
      var noteInput = null;
      // render the note input fields depending on note type
      if (note_type === "open") {
        noteInput = _.template(jQuery(view.openNoteInputTemplate).text(), {});
      } else if (note_type === "planning") {
        noteInput = _.template(jQuery(view.planningNoteInputTemplate).text(), {});
      } else if (note_type === "photo_set") {
        noteInput = _.template(jQuery(view.photoSetNoteTemplate).text(), {});
      } else if (note_type === "cross_cutting") {
        noteInput = _.template(jQuery(view.crossCuttingNoteInputTemplate).text(), {});
      } else {
        noteInput = null;
        throw "This should never happen";
      }

      // Add note input field html into div
      view.$el.find('.note-taking-toggle-input-form').html(noteInput);

      // Clear text input field
      this.$el.find('textarea').val('');

      // bloody magic mess, but seems to work
      var noteBody = app.currentNote.get('body');
      view.$el.find('textarea').each(function(index) {
        if (noteBody[view.$el.find('textarea')[index].name]) {
          view.$el.find('textarea')[index].value = noteBody[view.$el.find('textarea')[index].name];
        }
      });

      // this.$el.find('.note-body').val(app.currentNote.get('body'));

      // jQuery('.unpublished-note-picker').modal('hide');
      jQuery('.note-taking-toggle').slideDown();
      // jQuery('.resume-note-btn, .new-note-btn').attr('disabled', 'disabled');
      jQuery('#show-note-container').addClass('hidden');
    },

    publishNote: function() {
      var view = this;
      console.log('want me to do stuff, teach me');

      // go over all input fields, store information, and clear up
      var inputFields = view.$el.find('textarea');
      _.each(inputFields, function(inputField) {
        var noteBody = app.currentNote.get('body');
        noteBody[inputField.name] = inputField.value;
        app.currentNote.set('body', noteBody);
        inputField.value = '';
      });

      // app.currentNote.set('body', this.$el.find('.note-body').val());
      app.currentNote.set('published', true);

      app.currentNote.save();

      // clearing up
      // this.$el.find('.note-body').val('');
      // turn off auto save
      window.clearTimeout(app.autoSaveTimer);
      app.currentNote = null;
      jQuery('.note-taking-toggle').slideUp();

      jQuery('#show-note-container').removeClass('hidden');
    },

    render: function () {
      var view = this;
      // ATTENTION: render fills the dropdown to resume notes. Be careful when editing!

      // retrieve unpublished notes of user
      var notesToRestore = view.collection.where({author: app.username, published: false});
      // Armin will hate this, but it's really necessary. Armin, if you want to find a cleaner way of doing this plz let me know
      // filter the notesToRestore collection down to only notes that have a body (ie user has inputted content)
      notesToRestore = _.filter(notesToRestore, function(n) {
        return !jQuery.isEmptyObject(n.get('body'));
      });

      // clear dropdown button list
      view.$el.find('.dropdown-menu').html('');
      // fill dropdown button list
      _.each(notesToRestore, function(note){
        var body = note.get('body');
        var title = '';
        var option = null;
        // if there is a header show it
        if (body.title && body.title !== '') {
          title = body.title;
        } else {
          title = "Untitled";
        }
        // truncate and change the attribute :)
        if (title.length > 20) {
          title = title.substring(0,19);
          title += '[...]';
        }
        option = _.template(jQuery(view.resumeTemplate).text(), {'title': title, 'id': note.id, 'type': note.get('type')});
        view.$el.find('.dropdown-menu').append(option);
      });
    }
  });

  this.HG = HG;
}).call(this);
