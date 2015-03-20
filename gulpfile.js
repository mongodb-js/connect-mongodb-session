var gulp = require('gulp');
var mocha = require('gulp-mocha');
var config = require('./package.json');
var jscs = require('gulp-jscs');

gulp.task('test', function() {
  return gulp.src('./test/*').
    pipe(mocha({ reporter: 'nyan' }));
});

gulp.task('test-unit', function() {
  return gulp.src('./test/unit.test.js').
    pipe(mocha({ reporter: 'nyan' }));
});

var runCount = 0;
gulp.task('jscs', function() {
  console.log('\n---------\nRun ' + (++runCount) + ': ' + new Date() + '\n');
  return gulp.src('./index.js').
    pipe(jscs(config.jscsConfig));
});

gulp.task('watch', ['jscs', 'test'], function() {
  gulp.watch('./test/*', ['test']);
  gulp.watch('./index.js', ['jscs', 'test']);
});