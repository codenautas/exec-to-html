"use strict";
/* eqnull:true */

var execToHtml={};

var stream = require('stream');
var util = require('util');
var Promises = require('best-promise');
var spawn = require("child_process").spawn;

var path = require('path');

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
        onLine:function(f){
            var streamer=function(resolve,reject){
                var commandLine=commandLines[0];
                commandLines=commandLines.slice(1);
                var shell=commandLine[0]==='!';
                var lineForEmit;
                if(shell){ 
                    lineForEmit={
                        origin:'shell',
                        text:commandLine.substr(1)
                    };
                    if(path.sep==='\\'){
                        commandLine='cmd.exe /c '+commandLine.substr(1);
                    }else{
                        commandLine=commandLine.substr(1);
                    }
                }else{
                    lineForEmit={
                        origin:'command',
                        text:commandLine
                    };
                }
                var cargs=commandLine.split(' ');
                var cmd=cargs[0];
                cargs.splice(0, 1);
                var executer=spawn(cmd, cargs, {stdio: [ 'ignore', 'pipe', 'pipe']});
                if(opts.echo){
                    f(lineForEmit);
                }
                executer.stdio[1].on('data', function(data){
                    f({text:data.toString('utf8'), origin:'stdout'});
                });
                executer.stdio[2].on('data', function(data){
                    f({text:data.toString('utf8'), origin:'stderr'});
                });
                if(!commandLines.length){
                    executer.on('exit', resolve);
                    executer.on('error', reject);
                }else{
                    var continueStreaming=function(data){
                        streamer(resolve,reject);
                    }
                    executer.on('exit', continueStreaming);
                    executer.on('error', continueStreaming);
                };
            };
            return new Promises.Promise(streamer);
        }
    }
    return runner;
};



module.exports=execToHtml;