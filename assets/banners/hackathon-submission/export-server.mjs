import http from 'node:http';
import {readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join,extname} from 'node:path';
const root=fileURLToPath(new URL('.',import.meta.url));
const allowed=new Set(['clearing-bell-logo-512x512.png','clearing-bell-logo-1024x1024.png','clearing-bell-cover-1920x1080.png','clearing-bell-cover-640x360.png']);
http.createServer(async(req,res)=>{try{const path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(req.method==='POST'&&path.startsWith('/save/')&&allowed.has(path.slice(6))){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>15e6)throw Error('Too large');chunks.push(chunk)}const data=Buffer.concat(chunks);if(data.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw Error('PNG required');await writeFile(join(root,path.slice(6)),data);res.end('Saved');return}if(req.method!=='GET'||path.includes('..'))throw Error('Invalid request');const file=join(root,path==='/'?'export.html':path.slice(1));res.setHeader('Content-Type',({'.html':'text/html','.woff2':'font/woff2','.png':'image/png','.svg':'image/svg+xml'})[extname(file)]||'application/octet-stream');res.end(await readFile(file))}catch{res.statusCode=400;res.end('Request failed')}}).listen(8767,'127.0.0.1',()=>console.log('PNG exporter ready at http://127.0.0.1:8767'));
