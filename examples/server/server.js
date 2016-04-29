"use strict";

var _ = require('lodash');
var express = require('express');
var app = express();
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var Promises = require('best-promise');
var fs = require('fs-promise');
var path = require('path');
var readYaml = require('read-yaml-promise');
var extensionServe = require('extension-serve-static');
var jade = require('jade');

console.log('cwd',process.cwd());

var execToHtml=require('../..');

app.use(cookieParser());
app.use(bodyParser.urlencoded({extended:true}));

function serveJade(pathToFile,anyFile){
    return function(req,res,next){
        if(path.extname(req.path)){
            console.log('req.path',req.path);
            return next();
        }
        Promise.resolve().then(function(){
            var fileName=pathToFile+(anyFile?req.path+'.jade':'');
            return fs.readFile(fileName, {encoding: 'utf8'})
        }).catch(function(err){
            if(anyFile && err.code==='ENOENT'){
                throw new Error('next');
            }
            throw err;
        }).then(function(fileContent){
            var htmlText=jade.render(fileContent);
            serveHtmlText(htmlText)(req,res);
        }).catch(serveErr(req,res,next));
    }
}

// probar con http://localhost:12348/ajax-example
app.use('/',serveJade('examples/client',true));

function serveHtmlText(htmlText){
    return function(req,res){
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Content-Length', htmlText.length);
        res.end(htmlText);
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
        res.writeHead(200, {
            'Content-Length': text.length,
            'Content-Type': 'text/plain; charset=utf-8'
        });
        res.end(text);
    }
}

var mime = extensionServe.mime;

var validExts=[
    'html',
    'jpg','png','gif',
    'css','js','manifest'];

// ajax-best-promise.js
// 

app.use('/ajax-best-promise.js',function(req,res){
    res.sendFile(process.cwd()+'/node_modules/ajax-best-promise/bin/ajax-best-promise.js');
});

app.use('/',extensionServe('./examples/client', {
    index: ['index.html'], 
    extensions:[''], 
    staticExtensions:validExts
}));

var actualConfig;

var clientDb;

var PORT=12449;

var server=app.listen(PORT, function(event) {
    console.log('Listening on port %d', server.address().port);
});

app.get('/',serveHtmlText('<h1>Exec-To-Html</h1>'));

// localhost:12449/install?project=auto-deploy
app.use('/tools',execToHtml.middleware({baseDir:'../', control:true}));

