"use strict";
/* eqnull:true */

var execToHtml={};

var _ = require('lodash');
var stream = require('stream');
var util = require('util');
var Promises = require('best-promise');
var spawn = require("child_process").spawn;
var iconv = require('iconv-lite');
var os = require('os');
var fs = require('fs-promise');
var readYaml = require('read-yaml-promise');

var IDX_STDOUT  = 1;// 001
var IDX_STDERR  = 2;// 010
var BITMASK_END = 4;// 100

var path = require('path');

var winOS = path.sep==='\\';

function specialReject(message){
    var p=Promises.reject(new Error(message));
    return {
        onLine:function(){ return p; },
        then:function(){ return p; },
        'catch':function(x){ return p.catch(x); }
    };
}

execToHtml.commands={
    'npm':{shell:true},
    'ls':{shell:true, win:'dir/b'},
    'echo':{shell:true},
};

execToHtml.addLocalCommands = function addLocalCommands(existingCommands) {
    var localyaml='./local-config.yaml';
    return Promises.start(function() {
        return fs.exists(localyaml);
    }).then(function(existsYAML) {
        if(existsYAML) { return readYaml(localyaml); }
        return false;
    }).then(function(yamlconf){
        var cmds=yamlconf['commands'];
        if(cmds) {
            var cmd;
            for(cmd in cmds) {
                existingCommands[cmd] = cmds[cmd];
            }
        }
        return existingCommands;
    });
}

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
                return execToHtml.addLocalCommands(execToHtml.commands);
            }).then(function() {
            var streamer=function(resolve,reject){
                var commandLine=commandLines[0];
                commandLines=commandLines.slice(1);
                var lineForEmit={origin:'unknown'}; // para que origin esté primero en la lista de propiedades
                if(typeof commandLine === 'string'){
                    var commandInfo={};
                    if(commandLine[0]==='!'){
                        commandInfo.shell=true;
                        commandLine=commandLine.substr(1);
                    }
                    commandInfo.params=commandLine.split(' ');
                    commandInfo.command=commandInfo.params[0];
                    commandInfo.params.splice(0, 1);
                    lineForEmit.text=commandLine;
                }else{
                    var commandInfo=commandLine;
                    lineForEmit.text=[commandLine.command].concat(commandLine.params.map(function(param){
                        if(/ /.test(param)){
                            return JSON.stringify(param);
                        }
                        return param;
                    })).join(' ');
                }
                if(!('shell' in commandInfo)){
                    var infoCommand=execToHtml.commands[commandInfo.command];
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
                    spawnOpts.cwd=path.resolve(opts.cwd);
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
                    if(remainSignals) return;
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
                }
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
                            if(executer.buffer.match(/\r[^\n]|\n/)) {
                                var buffers = executer.buffer.split(/(\r\n|\r(?!\n)|\n)/);
                                var i=0;
                                for( ; i<buffers.length-1; i+=2) {
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
        prepare:function(projectName,opts){
            var dir=opts.baseDir+projectName;
            return fs.stat(dir).then(function(stat){
                if(!stat.isDirectory){
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
}

function serveErr(req,res,next){
    return function(err){
        if(err.message=='next'){
            return next();
        }
        console.log('ERROR', err);
        console.log('STACK', err.stack);
        var text='ERROR! '+(err.code||'')+'\n'+err.message+'\n------------------\n'+err.stack;
        res.writeHead(400, {
            'Content-Length': text.length,
            'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end(text);
    }
}

execToHtml.middleware = function execToHtmlMiddleware(opts){
    return function(req,res,next){
        console.log('req.path', req.path);
        var actionName;
        var projectName;
        Promises.start(function(){
            var params=req.path.split('/');
            if(params.length!=3){
                throw new Error('execToHtml.middleware expect /action/name');
            }
            actionName=params[1];
            projectName=params[2];
            console.log('ready to',actionName,projectName);
            return execToHtml.actions[actionName].prepare(projectName,opts);
        }).then(function(prepared){
            if(req.xhr){
                console.log('ajax request detected');
                res.append('Content-Type', 'application/octet-stream'); // por chrome bug segun: http://stackoverflow.com/questions/3880381/xmlhttprequest-responsetext-while-loading-readystate-3-in-chrome
            }
            return execToHtml.run.apply(execToHtml,prepared.runArgs).onLine(function(lineInfo){
                console.log(lineInfo);
                res.write(JSON.stringify(lineInfo)+'\n');
            }).then(function(){
                console.log('end!');
                res.end();
            });
        }).catch(serveErr(req,res));
    };
}

module.exports=execToHtml;
