import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PunchRecordRequest {
  employeeId: string;
  punchTimestamp: string;
  punchFaceUrl: string;
  punchFaceId: string; 
  punchLocationLong: number;
  punchLocationLat: number;
}

@Injectable({
  providedIn: 'root'
})
export class PunchService {
  private apiUrl = 'https://punchinsystemapi.azurewebsites.net/api/PunchIn';

  constructor(private http: HttpClient) {}

  punchIn(payload: PunchRecordRequest): Observable<any> {
    return this.http.post<any>(this.apiUrl, payload)
      .pipe(catchError(error => throwError(() => error)));
  }
}

