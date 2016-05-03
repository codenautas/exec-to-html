"use strict";

var _ = require('lodash');
var stream = require('stream');
var expect = require('expect.js');
var execToHtml = require('..');
var Path = require('path');
var fixtures = require('./fixtures.js');

var stream = require('stream');
var util = require('util');
var os = require('os');
var winOS = Path.sep==='\\';

describe('exec-to-html', function(){
    describe('internal streams', function(){
        it('first simple test', function(done){
            var obtainedLines=[];
            execToHtml.run('!echo hi5',{echo:false}).onLine(function(lineInfo){
                obtainedLines.push(lineInfo);
            }).then(function(exitCode){
                expect(obtainedLines).to.eql([{origin:'stdout', text:'hi5'+os.EOL}]);
                expect(exitCode).to.be(0);
                done();
            }).catch(done);
        });
        _.forEach(fixtures,function(fixture){
            if(fixture.skipped){
                it.skip('run fixture with stream. For fixutreName='+fixture.name+', skipped:'+fixture.skipped,function(){
                });
                return;
            }
            if(fixture.expected){
                it('run fixture with stream. For fixutreName='+fixture.name,function(done){
                    if(fixture.timeout){
                        this.timeout(fixture.timeout*(process.env.APPVEYOR?3:1));
                    }
                    var expectedLines=fixture.expected.slice(0);
                    var obtainedLines=[];
                    execToHtml.run(fixture.commands,fixture.opts).onLine(function(lineInfo){
                        obtainedLines.push(lineInfo);
                    }).then(function(exitCode){
                        if(fixture.slice) {
                            obtainedLines = obtainedLines.slice(fixture.slice[0], fixture.slice[1]);
                        }
                        // console.log("OL", obtainedLines); console.log("EX", fixture.expected);
                        expect(obtainedLines).to.eql(fixture.expected);
                        // console.log("exitCode",exitCode,fixture.exit);
                        expect(exitCode).to.eql(fixture.exit||0);
                        done();
                    }).catch(done);
                });
            }
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
    describe('internal streams error control', function(){
        it('must pass opts',function(done){
            execToHtml.run('!echo 1').onLine(function(){
                throw new Error('Unexpected data');
            }).then(function(){
                throw new Error('Reject expected');
            }).catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.message).to.match(/option echo is mandatory/);
                done();
            }).catch(done);
        });
    });
    describe('commands from local-config.yaml', function(){
        // modifico el archivo default
        execToHtml.localYamlFile = './test/local-config.yaml';
        var expCmds;
        beforeEach(function(){
            expCmds =  _.cloneDeep(execToHtml.commands);
            expCmds['diskspace'] = {
               win: 'dir|find "dirs"', unix: 'df -h --total | grep total', shell: true
            };
            expCmds['listar'] = { win: 'dir/b', unix: 'ls', shell: true };
            // fuerzo la relectura del local-config.yaml
            execToHtml.extraCommandsLoaded = undefined;
        });
        it('should register commands', function(done){
            execToHtml.addLocalCommands(execToHtml.commands).then(function(commands) {
                expect(commands).to.eql(expCmds);
                done();
            }).catch(done);
        });
        it('could run commands (#14)', function(done){
            var obtainedLines=[];
            execToHtml.run('listar test'+Path.sep+'fixtures.js',{echo:false}).onLine(function(lineInfo){
                obtainedLines.push(lineInfo);
            }).then(function(exitCode){
                expect(obtainedLines).to.eql([{origin:'stdout', text:(winOS?'fixtures.js':'test/fixtures.js')+os.EOL}]);
                expect(exitCode).to.be(0);
                done();
            }).catch(done);
        });
        it('should parse config only once', function(done){
            var obtainedLines=[];
            var args = 'listar test'+Path.sep+'fixtures.js';
            var params = {echo:false};
            var expLine = {origin:'stdout', text:(winOS?'fixtures.js':'test/fixtures.js')+os.EOL};
            function parseLine(lineInfo) {
                obtainedLines.push(lineInfo);
            }
            expect(execToHtml.extraCommandsLoaded).to.be(undefined);
            execToHtml.run(args,params).onLine(parseLine).then(function(exitCode){
                expect(obtainedLines).to.eql([expLine]);
                expect(obtainedLines.length).to.be(1);
                expect(exitCode).to.be(0);
                expect(execToHtml.extraCommandsLoaded).to.be(true);
                return execToHtml.run(args, params).onLine(parseLine).then(function(exitCode) {
                    expect(obtainedLines).to.eql([expLine, expLine]);
                    expect(obtainedLines.length).to.be(2);
                    expect(exitCode).to.be(0);
                    done();
                });
            }).catch(done);
        });
        describe('unexpected input coverage (#15)', function(){
            var originalYaml = execToHtml.localYamlFile;
            var existingCommands = {c1:'run 1', c2:'run 2'};
            afterEach(function(){
                execToHtml.localYamlFile = originalYaml;
            });
            it('should return false if yaml not found',function(done){
                execToHtml.localYamlFile = false;
                execToHtml.addLocalCommands(existingCommands).then(function(commands) {
                    expect(commands).to.be(false);
                    done();
                }).catch(done);
            });
            it('should preserve existing commands',function(done){
                execToHtml.localYamlFile = './test/local-config-dummy.yaml';
                execToHtml.addLocalCommands(existingCommands).then(function(commands) {
                    expect(commands).to.eql(existingCommands);
                    done();
                }).catch(done);
            });
        });
        execToHtml.localYamlFile = './test/local-config.yaml';
    });
});
