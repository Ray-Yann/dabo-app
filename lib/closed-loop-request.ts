/** Read an API JSON payload with a hard byte limit, including chunked requests. */
export class ClosedLoopRequestError extends Error {
 readonly status:400|413;
 constructor(status:400|413){super(status===413?"Requête trop volumineuse":"Requête invalide");this.status=status;}
}
export async function readClosedLoopJson(req:Request,maxBytes=16_384):Promise<unknown>{
 const declared=req.headers.get("content-length");
 if(declared!==null&&/^\d+$/.test(declared)&&Number(declared)>maxBytes)throw new ClosedLoopRequestError(413);
 const reader=req.body?.getReader();
 if(!reader)throw new ClosedLoopRequestError(400);
 const chunks:Uint8Array[]=[];
 let size=0;
 try{
  while(true){
   const {done,value}=await reader.read();
   if(done)break;
   size+=value.byteLength;
   if(size>maxBytes){await reader.cancel().catch(()=>{});throw new ClosedLoopRequestError(413);}
   chunks.push(value);
  }
 }catch(error){if(error instanceof ClosedLoopRequestError)throw error;throw new ClosedLoopRequestError(400);}
 const bytes=new Uint8Array(size);let offset=0;
 for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 try{return JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes));}
 catch{throw new ClosedLoopRequestError(400);}
}
