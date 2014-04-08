/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function() {
  "use strict";
  var HG = this.HG || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.View = this.Skeletor.Mobile.View || {};
  // filterObj is used for conditions to
  var filterObj = {
    types: ['planning'],
    tags: [],
    map_region: 0
  };

  /**
    Read View
  **/
  app.View.ReadView = Backbone.View.extend({

    noteListTemplate: "#notes-list-template",
    openNoteDetailTemplate: "#open-note-detail-template",
    planningNoteDetailTemplate: "#planning-note-detail-template",
    cuttingNoteDetailTemplate: "#cross-note-detail-template",
    photoNoteDetailTemplate: '#photo-note-detail-template',

    initialize: function () {
      var view = this;
      console.log('Initializing ReadView...', view.el);

      view.collection.on('change', function(n) {
        if (n.get('published')) {
          view.render();
        }
      });

      view.collection.on('add', function(n) {
        // check if event was triggered for a Document/ Model that is published
        // only render if published is set. This should avoid gettting hammered
        if (n.get('published')) {
          view.render();
        }
      });

      view.collection.on('destroy delete', function(n) {
        // check if event was triggered for a Document/ Model that is published
        // only render if published is set. This should avoid gettting hammered
        if (n.get('published')) {
          // this is a quick and easy solution to the rare case
          // that documents in a collection are deleted
          view.$el.find('.note-list').html('');
          view.render();
        }
      });

      view.render();

      return view;
    },

    events: {
      'click .filter-notes': 'filterNotes',
      'click .clear-notes': 'clearFilter',
      'click .list-item': 'showNoteDetails'
    },

    filterNotes: function() {
      var view = this;

      // show modal
      jQuery('.filter-notes-modal').modal('show');

      // populating the tags dropdowns from the tags collection
      app.tags.each(function(tag) {
        var tagName = tag.get('name');
        jQuery('.filter-tags-dropdown').append('<option value=' + '"' + tagName + '"' +'>'+ tagName +'</option>');
      });

      // adding selected class
      jQuery('.tag').on('click', function() {
        jQuery(this).addClass('selected');
      });

      // Populate taggedNotes on click and hide modal
      jQuery('.apply-filter').on('click', function(){
        // get all elements with .selected class and add to filterObj
        _.each(jQuery('#filter-note-types-container .selected'), function(el, index) {
          filterObj.types.push(jQuery(el).data().type);
        });

        // Add map region filter
        filterObj.map_region = Number(jQuery('#filter-map-region').val());

        // Tag custom tags
        _.each(jQuery('.filter-tags-dropdown'), function(dropdown) {
          var tag = jQuery(dropdown).val();
          debugger;
          if (tag !== "") {
            filterObj.tags.push(tag);
          }
        });
        // unique them
        filterObj.tags = _.uniq(filterObj.tags);

        // reset selected classes off divs
        jQuery('.selected').removeClass('selected');

        // hide modal
        jQuery('.filter-notes-modal').modal('hide');

        view.render();
      });
    },

    clearFilter: function() {
      var view = this;

      filterObj = {};
      view.render();
      jQuery().toastmessage('showSuccessToast', "Filters have been cleared");
    },

    showNoteDetails: function(event) {
      var view = this;
      var templateType = null;
      var htmlContents = null;

      // fetch model ID from DOM
      var modelId = jQuery(event.currentTarget).data('id');

      // set model from collection
      var clickedModel = view.collection.get(modelId);

      // If note is untitled
      if (clickedModel.get('body').title === '') {
        clickedModel.get('body').title = 'Untitled Note';
      }

      // set templateType and htmlContents
      if (clickedModel.get('type') === 'open') {
        templateType = view.openNoteDetailTemplate;
        htmlContents = {
                         'title': clickedModel.get('body').title,
                         'description': clickedModel.get('body').description,
                         'author': clickedModel.get('author'),
                         'body': clickedModel.get('body').open,
                         'created_at': clickedModel.get('created_at')
                        };
      } else if (clickedModel.get('type') === 'photo_set') {
        templateType = view.photoNoteDetailTemplate;
        htmlContents = {
                         'author': clickedModel.get('author'),
                         'description': clickedModel.get('body').description,
                         'explanation': clickedModel.get('body').explanation,
                         'question': clickedModel.get('body').question,
                         'title': clickedModel.get('body').title,
                         'created_at': clickedModel.get('created_at')
                        };
      } else if (clickedModel.get('type') === 'cross_cutting') {
        templateType = view.cuttingNoteDetailTemplate;
        htmlContents = {
                         'author': clickedModel.get('author'),
                         'title': clickedModel.get('body').title,
                         'description': clickedModel.get('body').description,
                         'explanation': clickedModel.get('body').explanation,
                         'created_at': clickedModel.get('created_at')
                        };
      } else if (clickedModel.get('type') === 'planning') {
        templateType = view.planningNoteDetailTemplate;
        htmlContents = {
                         'author': clickedModel.get('author'),
                         'hypothesis': clickedModel.get('body').hypothesis,
                         'description': clickedModel.get('body').description,
                         'evidence': clickedModel.get('body').evidence,
                         'title': clickedModel.get('body').title,
                         'created_at': clickedModel.get('created_at')
                        };
                      }

      var noteDetail = _.template(jQuery(templateType).text(), htmlContents);
      view.$el.find('.note-details').html(noteDetail);
    },

    render: function () {
      var view = this;
      console.log("Rendering ListView");

      // find the list where items are rendered into
      var list = this.$el.find('.note-list');
      list.html('');

      function filterer(note) {
        return note.get('published') === true &&
          filterObj.map_region === note.get('map_region') &&
          _.contains(filterObj.types, note.get('type')) &&
          _.intersection(note.get('tags'), filterObj.tags).length === filterObj.tags.length;
      }

      var filteredNotes = view.collection.filter(filterer).reverse();
      var totalNumPubNotes = filteredNotes.length;

      // adding total number of notes to H3
      if (totalNumPubNotes === 1) {
         jQuery('.note-number-total').html(totalNumPubNotes + 'Note');
      } else {
         jQuery('.note-number-total').html(totalNumPubNotes + ' Notes');
      }

      _.each(filteredNotes, function(note){
        var me_or_others = 'others';
        // add class 'me' or 'other' to note
        if (note.get('author') === app.username) {
          me_or_others = 'me';
        }

        var body = note.get('body');
        var title = note.get('body').title;
        if (title === '') {
          title = 'Untitled Note';
        }
        var bodyText = body[_.keys(body)[0]];
        var noteType = note.get('type');

        var listItem = _.template(jQuery(view.noteListTemplate).text(), {
          'id': note.id,
          'text': bodyText,
          'me_or_others': me_or_others,
          'author': note.get('author'),
          'created_at': note.get('created_at'),
          'note_type' : noteType,
          'title': title
        });

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
