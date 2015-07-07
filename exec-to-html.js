"use strict";
/* eqnull:true */

var execToHtml={};

var stream = require('stream');
var util = require('util');
var Promises = require('best-promise');
var spawn = require("child_process").spawn;

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
    var commandLine=commandLines[0];
    var pendingCommandLines=commandLines.slice(1);
    var shell=commandLine[0]==='!';
    var lineForEmit;
    if(shell){ 
        lineForEmit={
            origin:'shell',
            text:commandLine.substr(1)
        };
        commandLine='cmd.exe /c '+commandLine.substr(1);
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
    var continueOr=function continueOr(resolveOrReject){
        if(!pendingCommandLines.length){
            return resolveOrReject;
        }else{
        }
    }
    var runner={
        onLine:function(f){
            return new Promises.Promise(function(resolve,reject){
                if(opts.echo){
                    f(lineForEmit);
                }
                executer.stdio[1].on('data', function(data){
                    console.log('data 1 ',data.toString('utf8'));
                    f({text:data.toString('utf8'), origin:'stdout'});
                });
                executer.stdio[2].on('data', function(data){
                    console.log('data 2 ',data);
                    f({text:data, origin:'stderr - in the future'});
                });
                executer.on('exit', resolve);
                executer.on('error', reject);
            });
        }
    }
    return runner;
};



module.exports=execToHtml;