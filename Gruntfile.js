module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // uglify: {
    //   options: {
    //     banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
    //   },
    //   build: {
    //     src: 'src/<%= pkg.name %>.js',
    //     dest: 'build/<%= pkg.name %>.min.js'
    //   }
    // }
    jshint: {
      all: ['Gruntfile.js', 'js/*.js', 'mobile/js/*.js']
    },
    csslint: {
      dev: {
        options: {
          'box-sizing': false,
          'box-model': false,
          'ids': false,
          'important': false,
          'shorthand': false,
          'fallback-colors': false,
          'compatible-vendor-prefixes': false,
          'adjoining-classes': false,
          'import': false
        },
        src: ['mobile/css/mobile.css']
      }
    },
    jsonlint: {
      dev: {
        src: ['./*.json' ]
      }
    },
    coffeelint: {
      dev: {
        files: {
          src: ['shared/coffee/*.coffee', 'smartboard/coffee/*.coffee']
        },
        options: {
          'no_trailing_whitespace': {
            'level': 'warn'
          },
          'max_line_length': {
            'value': 120,
            'level': 'ignore'
          },
          'indentation': {
            'value': 4,
            'level': 'ignore'
          },
          'no_throwing_strings': {
            'level': 'ignore'
          },
          'no_unnecessary_fat_arrows': {
            'level': 'ignore'
          }
        }
      },
      linting: {
        files: {
          src: ['shared/coffee/*.coffee', 'smartboard/coffee/*.coffee']
        },
        options: {
          'no_trailing_whitespace': {
            'level': 'warn'
          },
          'max_line_length': {
            'value': 120,
            'level': 'warn'
          },
          'indentation': {
            'value': 4,
            'level': 'warn'
          },
          'no_throwing_strings': {
            'level': 'warn'
          }
        }
      }
    },
    coffee: {
      compile: {
        options: {
          sourceMap: true
        },
        files: {
          'shared/js/ck.model.js': 'shared/coffee/ck.model.coffee',
          'shared/js/ck.js': 'shared/coffee/ck.coffee',
          'smartboard/js/ck.smartboard.js': 'smartboard/coffee/ck.smartboard.coffee',
          'smartboard/js/ck.smartboard.view.js': [
            'smartboard/coffee/ck.smartboard.view.coffee',
            'smartboard/coffee/ck.smartboard.view.wall.coffee',
            'smartboard/coffee/ck.smartboard.view.wordcloud.coffee',
            'smartboard/coffee/ck.smartboard.view.balloons.coffee'
          ]
        }
      }
    },
    sass: {
      compile: {
        files: {
          'smartboard/css/ck.smartboard.css': 'smartboard/css/scss/ck.smartboard.scss'
        }
      }
    },
    watch: {
      files: ['smartboard/**/*.{js,scss}','shared/**/*.{js,scss}','mobile/**/*.{js,scss}','test/**/*.{js,scss}'],
      tasks: ['default'],
      options: { nospawn: true }
    }
  });

  // Load the plugin that provides the "uglify" task.
  // grunt.loadNpmTasks('grunt-contrib-uglify');
  // grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-csslint');
  grunt.loadNpmTasks('grunt-jsonlint');
  grunt.loadNpmTasks('grunt-coffeelint');
  grunt.loadNpmTasks('grunt-contrib-sass');
  grunt.loadNpmTasks('grunt-mocha');
  grunt.loadNpmTasks('grunt-contrib-watch');

  // Default task(s).
  // grunt.registerTask('default', ['uglify']);
  grunt.registerTask('default', ['jshint',  'jsonlint', 'coffeelint:dev', 'coffee', 'sass']);
  grunt.registerTask('lint', ['jshint', 'csslint', 'jsonlint', 'coffeelint:linting']);
  grunt.registerTask('compile', ['coffee', 'sass']);

  grunt.registerTask('test', 'run mocha-phantomjs', function () {
    var done = this.async();
    var child_process = require('child_process');

    child_process.exec('mocha-phantomjs ./test/smartboard.html', function (err, stdout) {
      grunt.log.write(stdout);
    });
  });
};