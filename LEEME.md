<!--multilang v0 es:LEEME.md en:README.md -->
# exec-to-html
<!--lang:es-->
Ejecuta comandos en el servidor enviando la salida en un *Stream* hacia el navegador.

<!--lang:en--]
Execute command sending output through stream to client

[!--lang:*-->

<!-- cucardas -->
![designing](https://img.shields.io/badge/stability-desgining-red.svg)
[![npm-version](https://img.shields.io/npm/v/exec-to-html.svg)](https://npmjs.org/package/exec-to-html)
[![downloads](https://img.shields.io/npm/dm/exec-to-html.svg)](https://npmjs.org/package/exec-to-html)
[![linux](https://img.shields.io/travis/codenautas/exec-to-html/master.svg)](https://travis-ci.org/codenautas/exec-to-html)
[![windows](https://ci.appveyor.com/api/projects/status/github/codenautas/exec-to-html?svg=true)](https://ci.appveyor.com/project/codenautas/exec-to-html)
[![coverage](https://img.shields.io/coveralls/codenautas/exec-to-html/master.svg)](https://coveralls.io/r/codenautas/exec-to-html)
[![climate](https://img.shields.io/codeclimate/github/codenautas/exec-to-html.svg)](https://codeclimate.com/github/codenautas/exec-to-html)
[![dependencies](https://img.shields.io/david/codenautas/exec-to-html.svg)](https://david-dm.org/codenautas/exec-to-html)

<!--multilang buttons-->

idioma: ![castellano](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-es.png)
también disponible en:
[![inglés](https://raw.githubusercontent.com/codenautas/multilang/master/img/lang-en.png)](README.md)

<!--lang:es-->

# Objetivo principal
 
 * Correr procesos en el servidor e ir enviando la salida de la consola al navegador

<!--lang:en--]

# Main goal

 * To call process in the back-end sending the output to de front-end

[!--lang:es-->

# Instalación

<!--lang:en--]

# Install

[!--lang:*-->

```sh
$ npm install exec-to-html
```

# Ejemplo de uso

<!--lang:en--]

# Use example

[!--lang:*-->

```js 
var execToHtml = require('exec-to-html');

execToHtml.run('npm-check-updates',{echo:true}).onLine(function(lineInfo){
	if(lineInfo.origin === 'stderr'){
		console.error(lineInfo.text);
	}else{
		console.log(lineInfo.text);
	}
}).then(function(exitCode){
	if(exitCode){
		console.log('exit code =',exitCode);
	}
});

```

<!--lang:es-->

## Licencias

<!--lang:en--]

## License

[!--lang:*-->

[MIT](LICENSE)