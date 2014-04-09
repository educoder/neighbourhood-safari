/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

(function() {
  "use strict";
  var HG = this.HG || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.View = this.Skeletor.Mobile.View || {};
  // filterObj is used for conditions to filter the notes collection
  var filterObj = {};

  /**
    Read View
  **/
  app.View.ReadView = Backbone.View.extend({

    // Templates
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

      jQuery('.tag').on('click', function(ev) {
        jQuery(ev.target).toggleClass('selected');
      });

      // Is this the cause of the multiple renders? I think soo.....
      // jQuery('.apply-filter').on('click', function() {
      //   view.applyFilters();
      // });

      view.render();

      return view;
    },

    events: {
      'click .filter-notes': 'showFilterModal',
      'click .clear-notes': 'clearFilter',
      'click .list-item': 'showNoteDetails',
      'click .apply-filter': 'applyFilters',
    },

    showFilterModal: function() {
      // show modal
      jQuery('.filter-notes-modal').modal('show');

      // clear and then populate the tags dropdowns from the tags collection
      jQuery('.filter-tags-dropdown').html('<option value=""></option>');
      app.tags.each(function(tag) {
        var tagName = tag.get('name');
        jQuery('.filter-tags-dropdown').append('<option value=' + '"' + tagName + '"' +'>'+ tagName +'</option>');
      });
    },

    applyFilters: function() {
      var view = this;
      filterObj = {
        published: true,
        types: [],
        tags: [],
        map_region: 0
      };

      // get all elements with .selected class and add to filterObj
      _.each(jQuery('#filter-note-types-container .selected'), function(element, index) {
        filterObj.types.push(jQuery(element).data().type);
      });

      // Get map region val and add to map region filterObj
      filterObj.map_region = Number(jQuery('#filter-map-region').val());

      // Tag custom tags
      _.each(jQuery('.filter-tags-dropdown'), function(dropdown) {
        var tag = jQuery(dropdown).val();
        if (tag !== "") {
          filterObj.tags.push(tag);
        }
      });

      // unique them
      filterObj.tags = _.uniq(filterObj.tags);

      // hide modal
      jQuery('.filter-notes-modal').modal('hide');
      // css up the filter button (maybe more make more heavy css)
      jQuery('.clear-notes').addClass('activated');

      view.render();
    },

    clearFilter: function() {
      var view = this;

      if (jQuery.isEmptyObject(filterObj)) {
        jQuery().toastmessage('showErrorToast', "No filters set");
      } else {
        filterObj = {};
        jQuery('#filter-note-types-container .selected').removeClass('selected');
        jQuery('.clear-notes').removeClass('activated');
        view.render();
        jQuery().toastmessage('showSuccessToast', "Filters have been cleared");
      }
    },

    showNoteDetails: function(event) {
      var view = this;
      // Type of template used
      var templateType = null;
      // The html contents passed into the view
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
          // if map_region is undefined, 0 or equal to current note
          (!filterObj.map_region || filterObj.map_region === '0' || filterObj.map_region === note.get('map_region')) &&
          _.contains(filterObj.types, note.get('type')) &&
          _.intersection(note.get('tags'), filterObj.tags).length === filterObj.tags.length;
      }

      var filteredNotes = null;
      if (jQuery.isEmptyObject(filterObj)) {
        filteredNotes = view.collection.where({published: true}).reverse();
      } else {
        filteredNotes = view.collection.filter(filterer).reverse();
      }

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
