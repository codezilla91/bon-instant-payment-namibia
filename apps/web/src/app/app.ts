import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AppToastComponent } from './components/app-toast/app-toast';
import { AppFooterComponent } from './components/app-footer/app-footer';
import { AppHeaderComponent } from './components/app-header/app-header';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, AppHeaderComponent, AppFooterComponent, AppToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class App {}
