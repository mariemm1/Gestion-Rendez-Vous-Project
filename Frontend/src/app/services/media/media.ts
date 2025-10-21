import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Camera, CameraResultType, CameraSource, Photo } from '@capacitor/camera';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class MediaService {
  private base = `${environment.apiUrl}/media`;

  constructor(private http: HttpClient) {}

  // ---- Camera / Gallery ----

  /** Take a new photo from device camera */
  async takePhoto(): Promise<Blob> {
    const p = await Camera.getPhoto({
      source: CameraSource.Camera,
      resultType: CameraResultType.Uri,  // gives us a webPath
      quality: 70,
      allowEditing: false,
      saveToGallery: false,
    });
    return this.photoToBlob(p);
  }

  /** Pick a photo from gallery / files */
  async pickPhoto(): Promise<Blob> {
    const p = await Camera.getPhoto({
      source: CameraSource.Photos,
      resultType: CameraResultType.Uri,
      quality: 80,
      allowEditing: false,
    });
    return this.photoToBlob(p);
  }

  /** Convert Capacitor Photo into a Blob we can send in FormData */
  private async photoToBlob(photo: Photo): Promise<Blob> {
    const url = photo.webPath || photo.path;
    if (!url) throw new Error('Aucune image');
    const resp = await fetch(url);
    return await resp.blob();
  }

  // ---- Upload ----

  /** Upload the given image as the user's avatar */
  uploadAvatar(image: Blob) {
    const fd = new FormData();
    // MUST match backend: upload.single('file')
    fd.append('file', image, 'avatar.jpg');
    return this.http.post<{ message: string; user: any }>(`${this.base}/avatar`, fd);
  }
}
