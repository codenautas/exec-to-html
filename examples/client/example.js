"use string";

function eid(x){
    return document.getElementById(x);
}

window.addEventListener('load', function(){
    eid('start').onclick=function(){
        eid('result').textContent='';
        eid('result').className='res_partial';
        AjaxBestPromise.get({
            url:'/install',
            data:AjaxBestPromise.fromElements(['project'])
        }).onChunk(function(resultPartial){
            eid('result').textContent+=resultPartial;
        }).then(function(result){
            eid('result').textContent=result;
            eid('result').className='res_ok';
        }).catch(function(err){
            result_err.textContent=err.message;
            result_err.textContent+='\n'+err.stack;
        });
    }
});