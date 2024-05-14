import {Inject, Injectable} from "@angular/core";
import {HttpClient} from "@angular/common/http";
import {APP_SETTINGS, AppSettings} from "../common/app-settings";
import {Observable, switchMap} from "rxjs";

@Injectable({providedIn:'root'})
export class RoomApiService {
  constructor(private http: HttpClient, @Inject(APP_SETTINGS) private appSettings: AppSettings) {
  }
  createById(id: string): Observable<string>{
    return this.http.post<string>(this.appSettings.apiBase+ '/rooms/' + id, "");
  }
  create():Observable<string>{
    return this.http.post<string>(this.appSettings.apiBase+ '/rooms', "");
  }

  join(roomId: string): Observable<string>{
    return this.http.post<string>(this.appSettings.apiBase+ '/rooms/'+ roomId + '/users', "");
  }
  users(roomId: string): Observable<string[]> {
    return this.http.get<string[]>(this.appSettings.apiBase+ '/rooms/'+ roomId + '/users');
  }

}
