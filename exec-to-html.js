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
        onLine:function(flush){
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
                    /* coverage depends on OS */
                    /* istanbul ignore next */
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
                    flush(lineForEmit);
                }
                executer.stdio[1].on('data', function(data){
                    flush({text:data.toString('utf8'), origin:'stdout'});
                });
                executer.stdio[2].on('data', function(data){
                    flush({text:data.toString('utf8'), origin:'stderr'});
                });
                executer.on('exit', function(exitCode){
                    if(opts.exitCode){
                        flush({text:exitCode.toString(), origin:'exit-code'});
                    }
                    if(!commandLines.length){
                        resolve(exitCode);
                    }else{
                        streamer(resolve,reject);
                    }
                });
                executer.on('error', function(err){
                    if(!commandLines.length){
                        reject(err);
                    }else{
                        streamer(resolve,reject);
                    }
                });
            };
            return new Promises.Promise(streamer);
        }
    }
    return runner;
};



module.exports=execToHtml;