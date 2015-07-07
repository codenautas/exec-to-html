"use strict";

var stream = require('stream');
var expect = require('expect.js');
var execToHtml = require('..');


var stream = require('stream');
var util = require('util');
var os = require('os');

/*
function StringStream(){
    this.buffer=[];
    stream.Writable.call(this);
};
util.inherits(StringStream, stream.Writable); 
StringStream.prototype._write = function(chunk, encoding, done) { 
  this.buffer.push(chunk.toString());
  done();
}
*/

// process.stdin.pipe(myStream);

describe('exec-to-html', function(){
    describe('internal streams', function(){
        it('first simple test', function(done){
            var lineCount=0;
            execToHtml.run('!echo hi5',{echo:false}).onLine(function(lineInfo){
                if(lineCount) done(new Error('many lines in first test'));
                lineCount++;
                expect(lineInfo.text).to.be('hi5'+os.EOL);
                expect(lineInfo.origin).to.be('stdout');
            }).then(function(exitCode){
                expect(exitCode).to.be(0);
                expect(lineCount).to.be(1);
                done();
            }).catch(done);
        });
        it('list of commands', function(done){
            var expectedLines=[
                {origin:'shell', text:'echo hi5'},
                {origin:'stdout', text:'hi5'+os.EOL},
                {origin:'shell', text:'echo two'},
                {origin:'stdout', text:'two'+os.EOL},
                {origin:'shell', text:'echo last'},
                {origin:'stdout', text:'last'+os.EOL}
            ];
            execToHtml.run(['!echo hi5','!echo two','!echo last']).onLine(function(lineInfo){
                if(!expectedLines.length) done(new Error('many lines in first test'));
                expect(lineInfo).to.eql(expectedLines.shift());
            }).then(function(exitCode){
                expect(exitCode).to.be(0);
                expect(expectedLines.length).to.be(0);
                done();
            }).catch(done);
        });
    });
});
