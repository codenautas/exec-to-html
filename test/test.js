"use strict";

var _ = require('lodash');
var stream = require('stream');
var expect = require('expect.js');
var execToHtml = require('..');

var fixtures = require('./fixtures.js');

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
        _.forEach(_.filter(fixtures,function(fixture){ return !fixture.skipped; }),function(fixture){
            it('run fixture with stream. For fixutreName='+fixture.name,function(done){
                if(process.env.APPVEYOR){
                    this.timeout(9000);
                }else{
                    this.timeout(5000);
                }
                var expectedLines=fixture.expected.slice(0);
                execToHtml.run(fixture.commands,fixture.opts).onLine(function(lineInfo){
                    // console.log('expect(',lineInfo,expectedLines.shift()); return;
                    if(!expectedLines.length) done(new Error('many lines in first test'));
                    expect(lineInfo).to.eql(expectedLines.shift());
                }).then(function(exitCode){
                    expect(exitCode).to.be(0);
                    expect(expectedLines.length).to.be(0);
                    done();
                }).catch(done);
            });
            if(fixture.collect){
                it('run fixture with collect. For fixutreName='+fixture.name,function(done){
                    var opts=_.clone(fixture.opts||{});
                    opts.collect=true;
                    execToHtml.run(fixture.commands,opts).then(function(result){
                        expect(result).to.eql(fixture.collect);
                        done();
                    }).catch(done);
                });
            };
        });
    });
});
