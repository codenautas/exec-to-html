"use strict";

var os = require('os');

var fixtures={
    outerrout:{
        expected:[
            {origin:'stdout', text:'first lines'+os.EOL+'via stdout.'+os.EOL},
            {origin:'stderr', text:'Error line.'+os.EOL},
            {origin:'stdout', text:'Last line.'+os.EOL},
        ]
    }
};

if(/fixtures\.js$/.test(process.argv[1])){
    fixtures[process.argv[2]].expected.forEach(function(message){
        process[message.origin].write(message.text);
    });
}

module.exports=fixtures;