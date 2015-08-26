var acquit = require('acquit');

var IGNORE_REGEXP = new RegExp('[\\s]+// acquit:ignore:start[\\s\\S]*?// acquit:ignore:end', 'g');

var content = require('fs').
  readFileSync('./test/examples.test.js').
  toString();
var blocks = acquit.parse(content, function(block) {
  if (block.code) {
    block.code = block.code.replace(IGNORE_REGEXP, '');
  }
});

var mdOutput =
  '# connect-mongodb-session\n\n' +
  '[MongoDB](http://mongodb.com)-backed session storage for ' +
  '[connect](https://www.npmjs.org/package/connect) and ' +
  '[Express](http://www.expressjs.com). Meant to be a ' +
  'well-maintained and fully-featured replacement for ' +
  'modules like [connect-mongo]' +
  '(https://www.npmjs.org/package/connect-mongo)\n\n' +
  '[![Build Status](https://travis-ci.org/mongodb-js/connect-mongodb-session.svg?branch=master)](https://travis-ci.org/mongodb-js/connect-mongodb-session) ' +
  '[![Coverage Status](https://coveralls.io/repos/mongodb-js/connect-mongodb-session/badge.svg?branch=master)](https://coveralls.io/r/mongodb-js/connect-mongodb-session?branch=master)\n\n' +
  '# API\n\n';

for (var i = 0; i < blocks.length; ++i) {
  var describe = blocks[i];
  mdOutput += '## ' + describe.contents + '\n\n';
  mdOutput += describe.comments[0] ?
    acquit.trimEachLine(describe.comments[0]).trim() + '\n\n' :
    '';

  for (var j = 0; j < describe.blocks.length; ++j) {
    var it = describe.blocks[j];
    mdOutput += '#### It ' + it.contents + '\n\n';
    mdOutput += it.comments.length ?
      acquit.trimEachLine(it.comments[it.comments.length - 1]).trim() + '\n\n' :
      '';
    mdOutput += '```javascript\n';
    mdOutput += '    ' + it.code + '\n';
    mdOutput += '```\n\n';
  }
}

require('fs').writeFileSync('README.md', mdOutput);
