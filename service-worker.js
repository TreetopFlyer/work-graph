import * as FSAccess from "./store-directory-handle.js";

self.addEventListener('install', ()=>{console.log("SW INSTALL"); return self.skipWaiting()}); // Activate worker immediately);
self.addEventListener('activate', ()=>{
  console.log("SW ACTIVATE");
  return self.clients.claim();
}); // Become available to all pages);
self.addEventListener('fetch', (event) =>event.respondWith(Interceptor(event)));

const options = {
  headers: {
    'Content-Type': 'application/javascript',
    'Cache-Control': 'no-cache'
  }
}

/** @type {(event:{request:Request})=>Promise<Response>} */
async function Interceptor(event)
{
  const url = new URL(event.request.url);
  const pathname = url.pathname.substring(1);
  let parts = pathname.split("/");

  const check = parts.indexOf("user-data");
  console.log(parts, check); 
  if(check > -1)
  {
    console.log("intercept:", pathname);

    const handle = await FSAccess.getDirectoryHandle();
    const path = parts.slice(check+1);
    const text = await FSAccess.Read(handle, path);
    if(text)
    {
      console.log("successful intercept:", pathname);
      return new Response(text, options);
    }
    else
    {
      console.log("failed intercept:", pathname);
    }

  }

  return fetch(event.request);

}
