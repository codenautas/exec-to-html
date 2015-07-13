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

var path = require('path');

var winOS = path.sep==='\\';

execToHtml.run = function run(commandLines, opts){
    if(!opts){
        opts={};
    }
    if(!('echo' in opts)){
        opts.echo=true;
    }
    if(typeof commandLines==='string'){
        commandLines=[commandLines];
    }
    var runner={
        onLine:function(flush){
            var streamer=function(resolve,reject){
                var commandLine=commandLines[0];
                commandLines=commandLines.slice(1);
                var lineForEmit={};
                if(typeof commandLine === 'string'){
                    var commandInfo={};
                    commandInfo.shell=commandLine[0]==='!';
                    if(commandInfo.shell){
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
                if(commandInfo.shell){ 
                    lineForEmit.origin='shell';
                    /* coverage depends on OS */
                    /* istanbul ignore next */
                    if(winOS){
                        commandInfo.params.unshift(commandInfo.command);
                        commandInfo.params.unshift('/c');
                        commandInfo.command='cmd.exe';
                    }else{   //console.log("Using non-win os with");
                    }
                }else{
                    lineForEmit.origin='command';
                }
                var spawnOpts={stdio: [ 'ignore', 'pipe', 'pipe']};
                if(opts.cwd){
                    spawnOpts.cwd=opts.cwd;
                }
                var executer=spawn(commandInfo.command, commandInfo.params, spawnOpts);
                if(opts.echo){
                    flush(lineForEmit);
                }
                _.forEach({stdout:1, stderr:2},function(streamIndex, streamName){
                    executer.stdio[streamIndex].on('data', function(data){
                        //console.log('data', data.toString());
                        if(opts.encoding && false){
                            console.log('dentro','français');
                            ['utf8','win1251','latin1','cp437'].forEach(function(encoding){
                                console.log(encoding, iconv.decode(data,encoding), encoding==opts.encoding, iconv.decode(data,opts.encoding));
                            });
                            console.log('saliendo',opts.encoding?iconv.decode(data,opts.encoding):data.toString());
                        }
                        
                        var rData = opts.encoding?iconv.decode(data,opts.encoding):data.toString();
                        if(!executer.buffer) { 
                            executer.buffer = '';
                            executer.origin = streamName;
                        }
                        executer.buffer += rData;
                        if(rData.substring(rData.length-1) == os.EOL) {
                            var buffer = executer.buffer;
                            executer.buffer = '';
                            flush({ text:buffer, origin:streamName });
                        }
//                        flush({
//                            text:opts.encoding?iconv.decode(data,opts.encoding):data.toString(), 
//                            origin:streamName
//                        });
                    });
                });
                _.forEach({exit:resolve, error:reject},function(endFunction, eventName){
                    executer.on(eventName, function(result){
                        if(eventName == 'exit' && executer.buffer && executer.buffer.length) {
                            flush({text:executer.buffer, origin: executer.origin});
                        }
                        //console.log("event", eventName, "result", result, "executer", executer.buffer);
                        setTimeout(function(){
                            if(opts[eventName]){
                                flush({text:result.toString(), origin:eventName});
                            }
                            if(!commandLines.length){
                                endFunction(result);
                            }else{
                                streamer(resolve,reject);
                            }
                        },1);
                    });
                });
            };
            return new Promises.Promise(streamer);
        }
    }
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
            //console.log("result", result);
            return result;
        });
    }
    return runner;
};



module.exports=execToHtml;
