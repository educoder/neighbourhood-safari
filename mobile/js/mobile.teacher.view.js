/*jshint debug:true, noarg:true, noempty:true, eqeqeq:true, bitwise:true, undef:true, curly:true, browser: true, devel: true, jquery:true, strict:false */
/*global Backbone, _, jQuery, Sail */

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

    initialize: function () {
      var view = this;
      console.log('Initializing TeacherView...', view.el);


      view.render();
      return view;
    },

    events: {
      'click .add-new-tag': 'addNewTag',
    },

    addNewTag: function(ev) {
      var view = this;
      // show modal
      console.log('Want to add tags? Teach me!');

      var tagname = view.$el.find('.new-tag').val();

      if (tagname.length > 0) {
        // add tag here
        // also check if already exists ...
        console.log (tagname);
        return tagname;
      } else {
        // show toast to enter something
        return '';
      }
    },

    render: function () {
      var view = this;
      console.log("Rendering TeacherView");
    }
  });

  this.HG = HG;
}).call(this);
