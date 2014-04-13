/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail, Skeletor */

(function() {
  "use strict";
  var HG = this.HG || {};
  this.Skeletor.Mobile = this.Skeletor.Mobile || {};
  var app = this.Skeletor.Mobile;
  app.View = this.Skeletor.Mobile.View || {};


  /**
    Teacher View
  **/
  app.View.TeacherView = Backbone.View.extend({
    // Templates
    // templateName: "#id-of-template-element",
    tagListTemplate: "#teacher-tag-list-template",

    initialize: function () {
      var view = this;
      console.log('Initializing TeacherView...', view.el);

      view.collection.on('add', function(n) {
        view.render();
      });

      view.collection.on('change update', function(n) {
        view.render();
      });

      view.render();
      return view;
    },

    events: {
      'click .add-new-tag': 'addNewTag',
      'keydown': 'checkKeyPress',
    },

    addNewTag: function(ev) {
      var view = this;
      // show modal
      console.log('Want to add tags? Teach me!');

      var tagname = view.$el.find('.new-tag').val();

      if (tagname.length > 0) {
        // tag to lower case
        tagname = tagname.toLowerCase().trim();
        // also check if already exists ...
        var existingTag = view.collection.where({"name": tagname});
        if (existingTag.length === 0) {
          // create new tag :)
          var date = new Date();
          var t = {
            'name': tagname,
            'created_at': date,
            'modified_at': date
          };

          var newTag = new Skeletor.Model.Tag(t);
          newTag.wake(app.config.wakeful.url);
          newTag.save();
          view.collection.add(newTag);

          view.$el.find('.new-tag').val('');

          return true;
        } else {
          var msg = "Tag with name '"+tagname+"' already exists!";
          jQuery().toastmessage('showErrorToast', msg);
          return false;
        }
      } else {
        // show toast to enter something
        jQuery().toastmessage('showErrorToast', "Please input a name for the tag you want to create");
        return false;
      }
    },

    checkKeyPress: function(e) {
      var view = this;

      if(e.keyCode === 13 && jQuery(e.target).hasClass('new-tag')){
        view.addNewTag(e);
        // alert('you pressed enter ^_^');
      }
    },

    render: function () {
      var view = this;

      // var tagList = jQuery('.tag-list');
      var tagList = view.$el.find('.tag-list');
      tagList.html('');

      view.collection.each(function(tag) {
        var tagListItem = _.template(jQuery(view.tagListTemplate).text(), {'tagName': tag.get('name')});
        tagList.append (tagListItem);
      });

      console.log("Rendering TeacherView");
    }
  });

  this.HG = HG;
}).call(this);
