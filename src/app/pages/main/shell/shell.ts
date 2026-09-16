import { Component } from '@angular/core';
import { Topbar } from '../topbar/topbar';

@Component({
  imports: [Topbar],
  selector: 'app-shell',
  styleUrl: './shell.scss',
  templateUrl: './shell.html',
})
export class Shell {}
