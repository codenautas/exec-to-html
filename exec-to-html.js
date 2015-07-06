"use strict";
/* eqnull:true */

var execToHtml={};

var stream = require('stream');
var util = require('util');
var Promises = require('best-promise');
var spawn = require("child_process").spawn;

execToHtml.run = function run(cmds, opts){
    cmds='cmd.exe /c '+cmds;
    var cargs=cmds.split(' ');
    var cmd=cargs[0];
    cargs.splice(0, 1);
    var executer=spawn(cmd, cargs, {stdio: [ 'ignore', 'pipe', 'pipe']});
    var runner={
        onLine:function(f){
            executer.stdio[1].on('data', function(data){
                console.log('data 1 ',data.toString('utf8'));
                f({text:data.toString('utf8'), origin:'stdout'});
            });
            executer.stdio[2].on('data', function(data){
                console.log('data 2 ',data);
                f({text:data, origin:'stderr - in the future'});
            });
            return new Promises.Promise(function(resolve,reject){
                executer.on('exit', resolve);
                executer.on('error', reject);
            });
        }
    }
    return runner;
};



module.exports=execToHtml;