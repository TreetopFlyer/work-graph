// 📦 IndexedDB Helper
/** @type {()=>Promise<IDBDatabase>} */
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('directory-handle-db', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('handles');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// 💾 Store a directory handle
/** @type {(handle:FileSystemDirectoryHandle)=>Promise<void>} */
export async function setDirectoryHandle(handle) {
  const db = await openDB();
  const tx = db.transaction('handles', 'readwrite');
  tx.objectStore('handles').put(handle, 'user-folder');
  console.log("handle set", handle);
  await tx.done;
}


// 📂 Retrieve a directory handle
/** @type {()=>Promise<FileSystemDirectoryHandle|false>} */
export async function getDirectoryHandle() {

  const db = await openDB();
  const tx = db.transaction('handles', 'readonly');
  return new Promise((resolve, reject) => {
    const getRequest = tx.objectStore('handles').get('user-folder');
    getRequest.onsuccess = () => {
      return resolve(getRequest.result);
    }
    getRequest.onerror = () => {
      console.error('Error retrieving directory handle:', getRequest.error);
      return resolve(false);
    }
  });
}

/** @type {(handle:FileSystemDirectoryHandle, parts:string[], create?:boolean)=>Promise<FileSystemFileHandle|false>} */
export async function Dig(handle, parts, create=false)
{
  try
  {
    let filePointer = handle;
    for(let i=0; i<parts.length-1; i++)
    {
      filePointer = await filePointer.getDirectoryHandle(parts[i], {create});
    }
    const leaf = await filePointer.getFileHandle(parts[parts.length-1], {create});
    return leaf;   
  }
  catch(e)
  {
    return false
  }
}

/** @type {(handle:FileSystemDirectoryHandle, parts:string[])=>Promise<string|false>} */
export async function Read(handle, parts)
{

  const fileHandle = await Dig(handle, parts);
  if(fileHandle)
  {
    const file = await fileHandle.getFile();
    return await file.text();
  }

  return false;
}

/** @type {(handle:FileSystemDirectoryHandle, parts:string[], text:string)=>Promise<boolean>} */
export async function Write(handle, parts, text)
{
  const fileHandle = await Dig(handle, parts, true);
  if(fileHandle)
  {
    const writeable = await fileHandle.createWritable();
    await writeable.write(text);
    await writeable.close();
    return true;
  }
  return false;
}


/** @type {(dirHandle:FileSystemDirectoryHandle, parentFolder:string, parts:Record<string, Date>)=>Promise<Record<string, Date>>} */
async function findJsonFilesWithModifiedDates(dirHandle, parentFolder="", results = {})
{

  const updatedParentFolder = parentFolder +"/"+ dirHandle.name;
  for await (const [name, handle] of dirHandle.entries())
  {
    if (handle.kind === 'file' && name.endsWith('.json'))
    {
      const file = await handle.getFile();
      results[updatedParentFolder + "/" + file.name] = new Date(file.lastModified);
    }
    else if (handle.kind === 'directory')
    {
      await findJsonFilesWithModifiedDates(handle, updatedParentFolder, results);
    }
  }
  return results;
}