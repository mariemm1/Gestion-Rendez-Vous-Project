// src/app/services/ui/ui.service.ts
import { Injectable } from '@angular/core';
import { LoadingController, ToastController, AlertController } from '@ionic/angular';

type ToastColor = 'success' | 'danger' | 'warning' | 'primary' | 'medium' | 'tertiary';

/**
 * UiService
 * ----------
 * One tiny service to:
 *  - show/hide a loading spinner
 *  - show toasts (success/error/warn)
 *  - show confirm / info alerts
 */
@Injectable({ providedIn: 'root' })
export class UiService {
  private loading?: HTMLIonLoadingElement;

  constructor(
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  // ---- Loading -------------------------------------------------------------

  async showLoading(message = 'Veuillez patienter...') {
    if (this.loading) return; // avoid stacking
    this.loading = await this.loadingCtrl.create({
      message,
      spinner: 'lines',
      backdropDismiss: false,
    });
    await this.loading.present();
  }

  async hideLoading() {
    try { await this.loading?.dismiss(); } catch {}
    this.loading = undefined;
  }

  /** Wrap any async work with auto spinner show/hide */
  async withLoading<T>(work: () => Promise<T>, message?: string): Promise<T> {
    await this.showLoading(message);
    try { return await work(); }
    finally { await this.hideLoading(); }
  }

  // ---- Toasts -------------------------------------------------------------

  async toast(message: string, color: ToastColor = 'primary', duration = 2000, icon?: string) {
    const t = await this.toastCtrl.create({ message, duration, color, position: 'top', icon });
    await t.present();
  }
  success(msg: string, ms = 1800) { return this.toast(msg, 'success', ms, 'checkmark-circle'); }
  error(msg: string, ms = 2500)   { return this.toast(msg, 'danger',  ms, 'alert-circle'); }
  warn(msg: string, ms = 2200)    { return this.toast(msg, 'warning', ms, 'warning'); }

  // ---- Alerts -------------------------------------------------------------

  async confirm(
    header = 'Confirmer',
    message = 'Êtes-vous sûr ?',
    okText = 'Oui',
    cancelText = 'Non'
  ): Promise<boolean> {
    const alert = await this.alertCtrl.create({
      header, message,
      buttons: [
        { text: cancelText, role: 'cancel' },
        { text: okText, role: 'confirm' },
      ],
    });
    await alert.present();
    const { role } = await alert.onDidDismiss();
    return role === 'confirm';
  }

  async alert(header = 'Information', message = '', buttonText = 'OK') {
    const alert = await this.alertCtrl.create({ header, message, buttons: [buttonText] });
    await alert.present();
  }
}
