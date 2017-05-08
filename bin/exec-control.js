"use strict";

function eid(x){
    return document.getElementById(x);
}

var baseUrlTool;

function startAction(){
    eid('status').textContent='starting';
    eid('result').textContent='';
    eid('result').className='res_partial';
    var lineCount=0;
    var currentDiv;
    AjaxBestPromise.get({
        url:baseUrlTool+'/'+AjaxBestPromise.completePath(['action','project']),
        data:{}
    }).onJson(function(line){
        eid('status').textContent='executing '+(++lineCount);
        if(!currentDiv || currentDiv.className!==line.origin){
            currentDiv=document.createElement('pre');
            eid('result').appendChild(currentDiv);
        }
        currentDiv.className=line.origin;
        if(!(line.origin==='exit' && line.text==='0')){
            currentDiv.textContent+=line.text.replace(/(\r\n?|\r?\n)$/,'');
        }
        if(line.text.match(/(\r\n?|\r?\n)$/) || line.origin.substr(0,3)!=='std'){
            currentDiv=null;
        }
    }).then(function(){
        eid('status').textContent='done';
        eid('result').className='res_ok';
    }).catch(function(err){
        result_err.textContent=err.message;
        result_err.textContent+='\n'+err.stack;
    });
}

window.addEventListener('load', function(){
    var params=window.location.href.split('/');
    baseUrlTool=params.slice(0,params.length-3).join('/');
    params.reverse();
    eid('action').textContent=params[1];
    eid('project').textContent=params[0];
    /*
    eid('status').textContent='press to start';
    eid('start').onclick=startAction;
    */
    startAction();
});