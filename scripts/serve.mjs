import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const allowed=new Set(['index.html','app.js','model.js','config.js','styles.css']);
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8'};
http.createServer(async(req,res)=>{try{const url=new URL(req.url,'http://localhost');let path=decodeURIComponent(url.pathname).slice(1)||'index.html';if(path==='__preview-data'){res.setHeader('Content-Type','application/json');res.setHeader('Cache-Control','no-store');res.end(await readFile(resolve(root,'.private/seed.json')));return;}if(!allowed.has(path)){res.writeHead(404);res.end('Not found');return;}res.setHeader('Content-Type',mime[extname(path)]);res.end(await readFile(resolve(root,path)));}catch{res.writeHead(500);res.end('Erro ao ler arquivo');}}).listen(4173,'127.0.0.1',()=>console.log('Preview: http://127.0.0.1:4173/?demo=1'));
