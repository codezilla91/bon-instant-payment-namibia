import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Toast, ToastService } from '../../toast.service';

@Component({
  selector: 'app-toast-container',
  imports: [CommonModule],
  templateUrl: './app-toast.html',
  styleUrl: './app-toast.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AppToastComponent {
  protected readonly toastService = inject(ToastService);

  protected trackToast(_index: number, toast: Toast): number {
    return toast.id;
  }
}
