"use strict";

var _ = require('lodash');
var os = require('os');
var path = require('path');
var winOS = path.sep==='\\';

var recivedExitCode = "issue #2"; // en este lugar hay que poner el exit-code recibido

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
        ],
        collect:{
            shell:'echo hi5'+'echo two'+'echo last',
            stdout:'hi5'+os.EOL+
                   'two'+os.EOL+
                   'last'+os.EOL
        },
        skipped:!winOS // sacar en issue #1
    },
    'out-err-out':{
        expected:[
            {origin:'stdout', text:'first lines'+os.EOL},
            {origin:'stderr', text:'Error line.'+os.EOL},
            {origin:'stdout', text:'Last line.'+os.EOL},
        ],
        opts:{echo:false},
        collect:{
            stdout:'first lines'+os.EOL+'Last line.'+os.EOL,
            stderr:'Error line.'+os.EOL
        },
        skipped:!winOS // sacar en issue #1
    },
    'char-by-char':{
        expected:[
            {origin:'stdout', text:'slow'+os.EOL},
        ],
        opts:{echo:false},
        splitter:'',
        delay:100,
        skipped:"issue #3"
    },
    'double-line':{
        messages:[
            {origin:'stdout', text:'first line'+os.EOL+
                                   'second line'+os.EOL}
        ],
        expected:[
            {origin:'stdout', text:'first line'+os.EOL},
            {origin:'stdout', text:'second line'+os.EOL},
        ],
        opts:{echo:false},
        skipped:"issue #4"
    },
    'err-within-outline':{
        expected:[
            {origin:'stdout', text:'first line'+os.EOL+'incomplete text, '},
            {origin:'stderr', text:'error message without EOL'},
            {origin:'stdout', text:'rest of the line'+os.EOL+'another text'},
        ],
        splitter:' ', //yes one space!
        delay:100,
        opts:{echo:false},
        skipped:"issue #5"
    },
    'incomplete-line':{
        expected:[
            {origin:'stdout', text:'first line'+os.EOL},
            {origin:'stdout', text:'incomplete line'},
        ],
        opts:{echo:false},
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
                exit:7
            },
            last:{
                expected:[
                    {origin:'stdout', text:'received exit code '+recivedExitCode+os.EOL},
                ]
            }
        },
        expected:[
            {origin:'command', text:'node test/fixtures.js exit-codes first'},
            {origin:'stdout', text:'ready to return 7'+os.EOL},
            {origin:'exit', text:'7'},
            {origin:'command', text:'node test/fixtures.js exit-codes last'},
            {origin:'stdout', text:'received exit code 7'+os.EOL},
            {origin:'exit', text:''}
        ],
        opts:{exit:true},
        skipped:"issue #2",
    },
    'encoding':{
        commands:[{
            command:winOS?'dir/b':'ls',
            params:['texte*']
        }],
        expected:[
            {origin:'stdout', text:'texte fran�ais.txt'}
        ],
        skipped:"issue #6"
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
    var messages=fixture.messages||fixture.expected;
    if('delay' in fixture){
        var message;
        var parts=[];
        var splitter=fixture.splitter||'';
        var sendByPart=function sendByPart(){
            if(!parts.length){
                if(!messages.length){
                    return;
                }else{
                    message=messages.shift();
                }
                parts='splitter' in fixture?message.text.split(splitter):[message];
            }else{
                var part=parts.shift();
                process[message.origin].write(part+(parts.length?splitter:''));
            }
            setTimeout(sendByPart,fixture.delay);
        };
        sendByPart();
    }else{
        messages.forEach(function(message){
            process[message.origin].write(message.text);
        });
    }
    if(fixture.exit){
        process.exitCode=fixture.exit;
    }
}

module.exports=fixtures;