"use strict";

function eid(x){
    return document.getElementById(x);
}

window.addEventListener('load', function(){
    eid('start').onclick=function(){
        eid('result').textContent='';
        eid('result').className='res_partial';
        var currentDiv;
        AjaxBestPromise.get({
            url:'/install',
            data:AjaxBestPromise.fromElements(['project'])
        }).onJson(function(line){
            if(!currentDiv || currentDiv.className!=line.origin){
                currentDiv=document.createElement('pre');
                eid('result').appendChild(currentDiv);
            }
            currentDiv.className=line.origin;
            if(!(line.origin=='exit' && line.text=='0')){
                currentDiv.textContent+=line.text.replace(/(\r\n?|\r?\n)$/,'');
            }
            if(line.text.match(/(\r\n?|\r?\n)$/) || line.origin.substr(0,3)!='std'){
                currentDiv=null;
            }
        }).then(function(){
            eid('result').className='res_ok';
        }).catch(function(err){
            result_err.textContent=err.message;
            result_err.textContent+='\n'+err.stack;
        });
    }
});