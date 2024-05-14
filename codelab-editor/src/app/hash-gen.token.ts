import {InjectionToken} from "@angular/core";
const encoder = new TextEncoder();
export const HASH_GEN = new InjectionToken<HashGen>('generation hash', {
  factory: ()=>{
    return async (text: string)=> {
      const textArray = encoder.encode(text);
      return await window.crypto.subtle.digest('SHA-256', textArray).then((bytes)=>{
        return Array.from(new Uint8Array(bytes)).map((b) => b.toString(16).padStart(2, "0"))
          .join("");
      });
    }
  }
})

export type HashGen =  (text: string) => Promise<string>;
