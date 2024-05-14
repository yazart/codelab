import {InjectionToken} from "@angular/core";

export const UUID_GEN = new InjectionToken('fn generation uuid', {
  factory: ()=>{
    return ()=>window.crypto.randomUUID();
  },
})
