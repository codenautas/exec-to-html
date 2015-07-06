"use strict";

var stream = require('stream');
var expect = require('expect.js');
var execToHtml = require('..');


var stream = require('stream');
var util = require('util');

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
            execToHtml.run('echo hi5',{echo:false}).onLine(function(lineInfo){
                if(lineCount) done(new Error('many lines in first test'));
                lineCount++;
                expect(lineInfo.text).to.be('hi5\r\n');
                expect(lineInfo.origin).to.be('stdout');
            }).then(function(exitCode){
                expect(exitCode).to.be(0);
                done();
            }).catch(done);
        });
    });
});
