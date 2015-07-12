"use strict";

var os = require('os');
var path = require('path');

var fixtures={
    'list of builtin commands':{
        commands:['!echo hi5','!echo two','!echo last'],
        expected:[
            {origin:'shell', text:'echo hi5'},
            {origin:'stdout', text:'hi5'+os.EOL},
            {origin:'shell', text:'echo two'},
            {origin:'stdout', text:'two'+os.EOL},
            {origin:'shell', text:'echo last'},
            {origin:'stdout', text:'last'+os.EOL}
        ]
    },
    'out-err-out':{
        expected:[
            {origin:'stdout', text:'first lines'+os.EOL+'via stdout.'+os.EOL},
            {origin:'stderr', text:'Error line.'+os.EOL},
            {origin:'stdout', text:'Last line.'+os.EOL},
        ],
        opts:{echo:false},
        skipped:path.sep==='/' // sacar en issue #1
    },
    'exit-codes':{
        commands:[
            'node test/fixtures.js exit-codes first', 
            'node test/fixtures.js exit-codes last'
        ],
        subCommands:{
            first:{
                expected:[
                    {origin:'stdout', text:'ready to return 7'+os.EOL},
                ],
                exitCode:7
            },
            last:{
                expected:[
                    {origin:'stdout', text:'received exit code 7'+os.EOL},
                ]
            }
        },
        expected:[
            {origin:'command', text:'node test/fixtures.js exit-codes first'},
            {origin:'stdout', text:'ready to return 7'+os.EOL},
            {origin:'exit-code', text:'7'},
            {origin:'command', text:'node test/fixtures.js exit-codes last'},
            {origin:'stdout', text:'received exit code 7'+os.EOL},
            {origin:'exit-code', text:''}
        ],
        opts:{exitCode:true},
        skipped:"issue #2"
    }
};

for(var fixtureName in fixtures){
    fixtures[fixtureName].name=fixtureName;
    fixtures[fixtureName].commands=fixtures[fixtureName].commands||'node test/fixtures.js '+fixtureName;
}

if(/fixtures\.js$/.test(process.argv[1])){
    var fixture=fixtures[process.argv[2]];
    if(process.argv[3]){
        fixture=fixture.subCommands[process.argv[3]];
    }
    fixture.expected.forEach(function(message){
        process[message.origin].write(message.text);
    });
    if(fixture.exitCode){
        process.exit(fixture.exitCode);
    }
}

module.exports=fixtures;