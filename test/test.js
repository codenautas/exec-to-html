"use strict";

var _ = require('lodash');
var fs = require('fs-promise');
var Promises = require('best-promise');
var stream = require('stream');
var expect = require('expect.js');
var execToHtml = require('..');
var Path = require('path');
var fixtures = require('./fixtures.js');

var stream = require('stream');
var sinon = require('sinon');
var util = require('util');
var os = require('os');
var winOS = Path.sep==='\\';

var request = require('supertest');

var dirbase;

if(process.env.TRAVIS){
    dirbase = process.env.HOME;
}else if(process.env.APPVEYOR){
    dirbase = process.env.APPVEYOR_BUILD_FOLDER;
    console.log('APPVEYOR ============ DIR',dirbase);
    dirbase = 'C:\\Users\\appveyor\\AppData\\Local\\Temp';
}else{
    dirbase = process.env.TMP || process.env.TEMP || '/tmp';
}
var dirtemp = dirbase;
dirbase+='/temp-exec-to-html';

describe('exec-to-html', function(){
    before(function(done){
        this.timeout(5000);
        var dest = Path.normalize(dirbase+'/pro1/');
        var destNM = dest+'/node_modules';
        var bakNM = dirtemp+'/node_modules';
        var existsNM=false;
        Promises.start(function(){
            return fs.exists(destNM);
        }).then(function(exists) {
            existsNM = exists;
            if(existsNM) { return fs.rename(destNM, bakNM); }
        }).then(function() {
            return fs.remove(dirbase);
        }).then(function(){
            return fs.copy('./test/pro1', dest, {clobber:true});
        }).then(function(){
            return fs.rename(dest+'dot-git', dest+'.git');
        }).then(function(){
            if(existsNM) { return fs.rename(bakNM, destNM); }
        }).then(function() {
            done();
        }).catch(function(err){
            console.log(err);
            done(_.isArray(err)?err[0]:err);
        });
    });
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
        it('must pass opts, detecting with onLine',function(done){
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
        it('must pass opts, detecting without onLine',function(done){
            execToHtml.run('!echo 2').then(function(){
                throw new Error('Reject expected');
            }).catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.message).to.match(/option echo is mandatory/);
                done();
            }).catch(done);
        });
        it('must pass opts, detecting directly',function(done){
            execToHtml.run('!echo 3').catch(function(err){
                expect(err).to.be.a(Error);
                expect(err.message).to.match(/option echo is mandatory/);
                done();
            }).catch(done);
        });
        it('must pass opts, detecting in then',function(done){
            execToHtml.run('!echo 4').then(function(){
                throw new Error('Reject expected');
            }, function(err){
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
        describe('unexpected input', function(){
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
    describe('server middleware', function() {
        var server;
        var bigTO = 40000;
        it("must run predefined commands",function(done){
            server = createServer();
            this.timeout(bigTO);
            var agent=request(server);
            agent
                .get('/exec-action/install/pro1')
                .end(function(err, res){
                    //console.log(res.text);
                    if(err){ return done(err); }
                    var lines = res.text.split('\n');
                    var txts = [];
                    for(var lp in lines) {
                        var line = lines[lp];
                        if(line !== '') {
                            var ln = JSON.parse(line);
                            if(ln.origin.match(/(command|shell)/) && ln.text.match(/^(git |npm)/)) {
                                txts.push(ln.text);
                            }
                        }
                    }
                    expect(txts).to.eql(['git pull','npm prune', 'npm install', 'npm test']);
                    done();
                });
        });
        it("must control dir in install",function(done){
            server = createServer();
            this.timeout(bigTO);
            fs.writeFile(dirbase+'/local-dummy','this is not a dir').then(function(){
                var agent=request(server);
                agent
                .get('/exec-action/install/local-dummy')
                .end(function(err, res){
                    if(err){ return done(err); }
                    expect(res.text).to.match(/error.*Not a Directory/i);
                    done();
                });
            });
        });
        it("coverage for controls/resources",function(done){
            server = createServer();
            this.timeout(bigTO);
            var agent=request(server);
            agent
                .get('/exec-action/controls/resources')
                .expect(winOS ? 301 : 404)
                .end(function(err, res){
                    //console.log(err); console.log(res);
                    if(err){ return done(err); }
                    done();
                });
        });
        it("coverage for controls (jade)",function(done){
            server = createServer();
            this.timeout(bigTO);
            var agent=request(server);
            agent
                .get('/exec-action/controls')
                .end(function(err, res){
                    //console.log(res.text);
                    if(err){ return done(err); }
                    expect(res.text).to.match(/exec-control.css/);
                    expect(res.text).to.match(/exec-control.js/);
                    done();
                });
        });
        it("coverage for errors",function(done){
            server = createServer();
            sinon.stub(console, "log");
            this.timeout(bigTO);
            var agent=request(server);
            agent
                .get('/exec-action/install')
                .expect(400)
                .end(function(err, res){
                    if(err){ return done(err); }
                    //console.log("TEXT", res.text);
                    expect(res.text).to.match(/ERROR: execToHtml.middleware expect \/action\/name/);
                    console.log.restore();
                    done();
                });
        });
    });
});

var express = require('express');

function createServer() {
    var app = express();
    app.listen();
    app.use('/exec-action',execToHtml.middleware({baseDir:dirbase+'/'}));
    return app;
}