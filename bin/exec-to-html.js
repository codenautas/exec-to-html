"use strict";
/*jshint eqnull:true */
/*jshint node:true */
/*eslint-disable no-console */

var execToHtml = {};

var _ = require('lodash');
var Promises = require('best-promise');
var spawn = require("child_process").spawn;
var iconv = require('iconv-lite');
var fs = require('fs-promise');
var readYaml = require('read-yaml-promise');

var MiniTools = require('mini-tools');
var send = require('send');
var serveErr=MiniTools.serveErr;

var IDX_STDOUT  = 1;// 001
var IDX_STDERR  = 2;// 010
var BITMASK_END = 4;// 100

var Path = require('path');

var winOS = Path.sep==='\\';

function specialReject(message){
    var p=Promises.reject(new Error(message));
    return {
        onLine:function(){ return p; },
        then:function(f, fErr){ return p.then(f, fErr); },
        'catch':function(fErr){ return p.catch(fErr); }
    };
}

execToHtml.commands={
    'npm':{shell:true},
    'ls':{shell:true, win:'dir/b'},
    'echo':{shell:true}
};

execToHtml.localYamlFile = './local-config.yaml';
execToHtml.addLocalCommands = function addLocalCommands(existingCommands) {
    return Promises.start(function() {
        return readYaml(execToHtml.localYamlFile);
    }).then(function(yamlconf){
        var cmds=yamlconf.commands;
        if(cmds) {
            /*jshint forin: false */
            for(var cmd in cmds) {
                existingCommands[cmd] = cmds[cmd];
            }
            /*jshint forin: true */
        }
        return existingCommands;
    }).catch(function(){
        return false;
    });
};

execToHtml.run = function run(commandLines, opts){
    if(!opts || !('echo' in opts)){
        return specialReject('execToHtml.run ERROR: option echo is mandatory');
    }
    if(!('buffering' in opts)) {
        opts.buffering = true;
    }
    if(!('error' in opts)) {
        opts.error = true;
    }
    if(typeof commandLines==='string'){
        commandLines=[commandLines];
    }
    var runner={
        onLine:function(flush){
            return Promises.start(function() {
                if(! execToHtml.extraCommandsLoaded) {
                    execToHtml.extraCommandsLoaded = true;
                    return execToHtml.addLocalCommands(execToHtml.commands);
                } else {
                    return true;
                }
            }).then(function() {
                var streamer=function(resolve,reject){
                    var commandLine=commandLines[0];
                    commandLines=commandLines.slice(1);
                    var lineForEmit={origin:'unknown'}; // para que origin esté primero en la lista de propiedades
                    var commandInfo;
                    if(typeof commandLine === 'string'){
                        commandInfo={};
                        if(commandLine[0]==='!'){
                            commandInfo.shell=true;
                            commandLine=commandLine.substr(1);
                        }
                        commandInfo.params=commandLine.split(' ');
                        commandInfo.command=commandInfo.params[0];
                        commandInfo.params.splice(0, 1);
                        lineForEmit.text=commandLine;
                    }else{
                        commandInfo=commandLine;
                        lineForEmit.text=[commandLine.command].concat(commandLine.params.map(function(param){
                            if(/ /.test(param)){
                                return JSON.stringify(param);
                            }
                            return param;
                        })).join(' ');
                    }
                    var infoCommand;
                    if(!('shell' in commandInfo)){
                        infoCommand=execToHtml.commands[commandInfo.command];
                        if(infoCommand){
                            commandInfo.shell=!!infoCommand.shell;
                            if(winOS && infoCommand.win){
                                commandInfo.command=infoCommand.win;
                                lineForEmit.realCommand=infoCommand.win;
                            } else if(infoCommand.unix) {
                                commandInfo.command=infoCommand.unix;
                                lineForEmit.realCommand=infoCommand.unix;
                            }
                        }
                    }
                    if(commandInfo.shell){ 
                        lineForEmit.origin='shell';
                        /* coverage depends on OS */
                        /* istanbul ignore next */
                        if(winOS){
                            commandInfo.params.unshift(commandInfo.command);
                            commandInfo.params.unshift('/c');
                            commandInfo.command='cmd.exe';
                        } else {
                            // Ponemos comillas si hay espacios en el nombre
                            commandInfo.params = _.map(commandInfo.params, function(e) {
                                return (e.match(/ /)) ? '"' + e + '"' : e;
                            });
                            commandInfo.params = [commandInfo.command+' '+ commandInfo.params.join(' ')];
                            commandInfo.params.unshift('-c');
                            commandInfo.command='sh';
                        }
                    }else{
                        lineForEmit.origin='command';
                    }
                    var spawnOpts={stdio: [ 'ignore', 'pipe', 'pipe']};
                    if(opts.cwd){
                        spawnOpts.cwd=Path.resolve(opts.cwd);
                    }
                    if(opts.echo){
                        flush(lineForEmit);
                    }
                    var remainSignals=IDX_STDOUT | IDX_STDERR | BITMASK_END;
                    var endFunctions={
                        exit: {resolveOrReject:resolve, flags:BITMASK_END  }, 
                        error:{resolveOrReject:opts.throwError?reject:resolve , flags:remainSignals}
                    };
                    var eventNameForEnd = null;
                    var resultForEnd = null;
                    var finalizer=function(bitmask, result, eventName){
                        if(eventName){
                            eventNameForEnd = eventName;
                            resultForEnd = result;
                        }
                        remainSignals = remainSignals & ~bitmask;
                        if(remainSignals){ 
                            return;
                        }
                        if(executer.buffer && executer.buffer.length) {
                            flush({origin: executer.origin, text:executer.buffer});
                        }
                        if(opts[eventNameForEnd]){
                            if(resultForEnd==null){
                                resultForEnd='empty result';
                            }
                            flush({origin:eventNameForEnd, text:resultForEnd.toString()});
                        }
                        if(!commandLines.length){
                            endFunctions[eventNameForEnd].resolveOrReject(resultForEnd);
                        }else{
                            streamer(resolve,reject);
                        }
                    };
                    var executer=spawn(commandInfo.command, commandInfo.params, spawnOpts);
                    _.forEach({stdout:1, stderr:2},function(streamIndex, streamName){
                        executer.stdio[streamIndex].on('data', function(data){
                            /* NO BORRAR, QUIZÁS LO NECESITEMOS PARA DEDUCIR encoding
                            if(opts.encoding && false){
                                console.log('dentro','français');
                                ['utf8','win1251','latin1','cp437'].forEach(function(encoding){
                                    console.log(encoding, iconv.decode(data,encoding), encoding==opts.encoding, iconv.decode(data,opts.encoding));
                                });
                                console.log('saliendo',opts.encoding?iconv.decode(data,opts.encoding):data.toString());
                            }
                            */
                            var rData = opts.encoding?iconv.decode(data,opts.encoding):data.toString();
                            if(! opts.buffering) {
                                flush({origin:streamName,  text:rData});
                            } else {
                                if(!executer.buffer) { 
                                    executer.buffer = '';
                                    executer.origin = streamName;
                                }
                                if(streamName != executer.origin && executer.buffer.length) {
                                    var buffer = executer.buffer;
                                    executer.buffer = '';
                                    flush({origin:executer.origin, text:buffer});
                                    executer.origin = streamName;
                                }
                                executer.buffer += rData;
                                if(executer.buffer.match(/(\r\n|\r(?!\n|$)|\n)/)) {
                                    var buffers = executer.buffer.split(/(\r\n|\r(?!\n|$)|\n)/);
                                    for(var i=0; i<buffers.length-1; i+=2) {
                                        flush({origin:streamName,  text:buffers[i]+buffers[i+1]});
                                    }
                                    executer.buffer = buffers[i];
                                }
                            }
                        });
                        executer.stdio[streamIndex].on('end', function(){
                            finalizer(streamIndex);
                        });
                    });
                    _.forEach(endFunctions,function(infoEvent, eventName){
                        executer.on(eventName, function(result){
                            finalizer(infoEvent.flags,result,eventName);
                        });
                    });
                };
            return new Promises.Promise(streamer);
            });
        }
    };
    if(opts.collect){
        var result={};
        return runner.onLine(function(lineInfo){
            if(!(lineInfo.origin in result)){
                result[lineInfo.origin]='';
            }
            result[lineInfo.origin]+=lineInfo.text;
        }).then(function(exit){
            if(exit){ 
                result.exit=exit; 
            }
            return result;
        });
    }
    return runner;
};

execToHtml.actions = {
    install:{
        prepare:function(opts,projectName){
            var dir=opts.baseDir+projectName;
            return fs.stat(dir).then(function(stat){
                if(!stat.isDirectory()){
                    throw new Error('invalid project name. Not a Directory');
                }
                return {runArgs:[[
                    'git pull',
                    'npm prune',
                    'npm install',
                    'npm test'
                ],{echo:true, exit:true, cwd:dir}]};
            });
        }
    }
};

execToHtml.middleware = function execToHtmlMiddleware(opts){
    return function(req,res,next){
        var actionName;
        Promises.start(function(){
            var params=req.path.split('/');
            actionName=params[1];
            if(actionName==='controls'){
                var pathFile;
                if(params[2]==='resources'){
                    pathFile='/'+params.slice(3).join('/');
                    send(req, Path.join(__dirname, pathFile), {}).pipe(res);
                }else{
                    pathFile=__dirname+'/exec-control';
                    MiniTools.serveJade(pathFile,false)(req,res,next);
                }
            }else{
                var projectName;
                return Promises.start(function(){
                    if(params.length!=3){
                        throw new Error('execToHtml.middleware expect /action/name');
                    }
                    projectName=params[2];
                    return execToHtml.actions[actionName].prepare(opts,projectName);
                }).then(function(prepared){
                    if(req.xhr){
                        res.append('Content-Type', 'application/octet-stream'); // por chrome bug segun: http://stackoverflow.com/questions/3880381/xmlhttprequest-responsetext-while-loading-readystate-3-in-chrome
                    }
                    return execToHtml.run.apply(execToHtml,prepared.runArgs).onLine(function(lineInfo){
                        res.write(JSON.stringify(lineInfo)+'\n');
                    }).then(function(){
                        res.end();
                    });
                });
            }
        }).catch(serveErr(req,res));
    };
};

module.exports=execToHtml;
