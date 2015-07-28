"use strict";

function eid(id){ return document.getElementById(id); }

window.addEventListener('load',function(){
    eid('start').disabled=false;
    eid('start').onclick=function(){
        var iframe=document.createElement('iframe');
        iframe.style.width='100%';
        iframe.src='/tools/controls/install/'+encodeURI(eid('project').value);
        eid('iframe').appendChild(iframe);
    };
});