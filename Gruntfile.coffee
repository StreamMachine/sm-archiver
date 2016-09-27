module.exports = (grunt) ->
    grunt.initConfig
        pkg: grunt.file.readJSON 'package.json'
        coffee:
            coffee_to_js:
                options:
                    bare: true
                    sourceMap: true
                expand: true
                flatten: false
                src: ["src/**/*.coffee"]
                dest: 'js/'
                ext: ".js"
        copy:
            v8:
                expand: true,
                cwd: "src/archiver/monitors/v8/",
                src: ["build/**/*"],
                dest: "js/src/archiver/monitors/v8/"

    grunt.loadNpmTasks 'grunt-contrib-coffee'
    grunt.loadNpmTasks 'grunt-contrib-copy'

    grunt.registerTask 'default', ['coffee', 'copy']
