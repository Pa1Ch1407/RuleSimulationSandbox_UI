import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

/** Shell: app name and description on every page, then the current page. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {}
