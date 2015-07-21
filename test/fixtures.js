"use strict";

var _ = require('lodash');
var os = require('os');
var path = require('path');
var winOS = path.sep==='\\';
var semver = require('semver');
var colors = require('colors');
colors.enabled = true;

var fixtures={
    'command-ENOENT':{
        commands:['aenoentcmd parameter1 parameter2'],
        opts:{echo:true},
        expected:[
            {origin:'command', text:'aenoentcmd parameter1 parameter2'},
            {origin:'error', text:'Error: spawn ENOENT'}
        ],
        exit:{"code":"ENOENT","errno":"ENOENT","syscall":"spawn"}
    },
    'controled-colored':{
        opts:{echo:false},
        expected:[
            {origin:'stdout', text:'red'.red+' '+
                                   'is not'.underline+' '+
                                   'good for background'.bgYellow+' '+
                                   'Bold yes'.bold.italic.green+os.EOL}
        ]
    },
    'npm-colored':{
        commands:['npm prefix --verbose --color=always'],
        opts:{echo:true},
        expected:[
            {origin:'shell', text:'npm prefix --verbose --color=always'},
            {origin:'stderr', text:'npm'.white},
            {origin:'stdout', text:process.cwd()+'\n'},
            {origin:'stderr', text:' info'.green+' it worked if it ends with'.magenta+' ok\n'}
        ],
        slice:[0,3],
        skipped:true
    },
    'list of builtin commands':{
        commands:['echo hi5','!echo two','!echo last'],
        opts:{echo:true},
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
            stderr:'Error line.'+os.EOL,
            exit:123
        },
        exit:123
    },
    'char-by-char':{
        expected:[
            {origin:'stdout', text:'slow'+os.EOL},
        ],
        opts:{echo:false},
        splitter:'',
        delay:100
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
    },
    'mixed-EOL':{
        messages:[
            {origin:'stdout', text:'first line\n'+
                                   'second line\r\n'+
                                   'third line\r'+
                                   'fourth line'}
        ],
        expected:[
            {origin:'stdout', text:'first line\n'},
            {origin:'stdout', text:'second line\r\n'},
            {origin:'stdout', text:'third line\r'},
            {origin:'stdout', text:'fourth line'},
        ],
        opts:{echo:false},
        skipped:'#11',
    },
    'err-within-outline':{
        expected:[
            {origin:'stdout', text:'first line'+os.EOL},
            {origin:'stdout', text:'incomplete text, '},
            {origin:'stderr', text:'error message without EOL'},
            {origin:'stdout', text:'rest of the line'+os.EOL},
            {origin:'stdout', text:'another text'},
        ],
        splitter:' ', //yes one space!
        delay:100,
        opts:{echo:false},
        timeout:4000
    },
    'err-within-outline-no-buffer-big':{
        expected:[
            {origin:'stdout', text:'first line'+os.EOL+'incomplete text, '},
            {origin:'stderr', text:'error message without EOL'},
            {origin:'stdout', text:'rest of the line'+os.EOL+'another text'}
        ],
        opts:{echo:false, buffering:false}
    },
    'err-within-outline-no-buffer-little':{
        messages:[
            {origin:'stdout', text:'first line'+os.EOL},
            {origin:'stdout', text:'incomplete text, '},
            {origin:'stderr', text:'error message without EOL'},
            {origin:'stdout', text:'rest of the line'+os.EOL},
            {origin:'stdout', text:'another text'},
        ],
        expected:[
            {origin:'stdout', text:'first '},
            {origin:'stdout', text:'line'+os.EOL},
            {origin:'stdout', text:'incomplete '},
            {origin:'stdout', text:'text, '},
            
            {origin:'stderr', text:'error '},
            {origin:'stderr', text:'message '},
            {origin:'stderr', text:'without '},
            
            {origin:'stderr', text:'EOL'},
            {origin:'stdout', text:'rest '},
            {origin:'stdout', text:'of '},
            {origin:'stdout', text:'the '},
            {origin:'stdout', text:'line'+os.EOL},
            {origin:'stdout', text:'another '},
            {origin:'stdout', text:'text'},
        ],
        splitter:' ', //yes one space!
        delay:40,
        opts:{echo:false, buffering:false},
    },
    'incomplete-line':{
        expected:[
            {origin:'stdout', text:'first line'+os.EOL},
            {origin:'stdout', text:'incomplete line'},
        ],
        opts:{echo:false}
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
                    {origin:'stdout', text:'ready to return normally'+os.EOL},
                ]
            }
        },
        expected:[
            {origin:'command', text:'node test/fixtures.js exit-codes first'},
            {origin:'stdout', text:'ready to return 7'+os.EOL},
            {origin:'exit', text:'7'},
            {origin:'command', text:'node test/fixtures.js exit-codes last'},
            {origin:'stdout', text:'ready to return normally'+os.EOL},
            {origin:'exit', text:'0'}
        ],
        opts:{echo:true, exit:true}
    },
    'dir':{
        commands:[{
            command:winOS?'dir/b':'ls',
            shell:true,
            params:['texte*']
        }],
        opts:{echo:false, cwd:'./test', encoding:winOS?'cp437':'utf8'},
        expected:[
            {origin:'stdout', text:'texte français.txt'+os.EOL}
        ]
    },
    'extended-filename':{
        commands:[{
            command:'ls',
            params:['texte français.txt']
        }],
        opts:{echo:true, cwd:'./test', encoding:winOS?'cp437':'utf8'},
        expected:[
            (winOS?{origin:'shell', text:'ls "texte français.txt"', realCommand:'dir/b'}
                  :{origin:'shell', text:'ls "texte français.txt"'}),
            {origin:'stdout', text:'texte français.txt'+os.EOL}
        ]
    },
    'encoding-ansi':{
        commands:[{
            command:winOS?'type':'cat',
            shell:true,
            params:['ansi-text.txt']
        }],
        opts:{echo:true, cwd:'./test', encoding:'latin1'},
        expected:[
            {origin:'shell', text:(winOS?'type':'cat')+' ansi-text.txt'},
            {origin:'stdout', text:'français in ANSI'}
        ],
    },
    'encoding-utf8':{
        commands:[{
            command:winOS?'type':'cat',
            shell:true,
            params:['utf8-text.txt']
        }],
        opts:{echo:true, cwd:'./test'},
        expected:[
            {origin:'shell', text:(winOS?'type':'cat')+' utf8-text.txt'},
            {origin:'stdout', text:'français in UTF8'}
        ],
    },
    'npm-prefix':{
        commands:['npm prefix'],
        opts:{echo:true},
        expected:[
            {origin:'shell', text:'npm prefix'},
            {origin:'stdout', text:process.cwd()+'\n'}
        ]
    },
    'npm-prune':{
        commands:[{
            command:'npm',
            params:['prune','--verbose']
        }],
        opts:{echo:true},
        expected:[
            {origin:'shell', text:'npm prune --verbose'},
            {origin:'stdout', text:'npm info it worked if it ends with ok'}
        ],
        slice:[0,2],
        skipped:"#11"
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
        if(semver.lt(process.version.substr(1),'0.12.0')){
            setTimeout(function(){
                process.exit(fixture.exit);
            },(fixture.delay*2||0)+100);
        }else{
            process.exitCode=fixture.exit;
        }
    }
}

module.exports=fixtures;
