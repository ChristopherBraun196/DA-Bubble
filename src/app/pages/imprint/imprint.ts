import { Component } from '@angular/core';
import { Header } from '../login/shared/header/header';
import { RouterLink } from '@angular/router';

@Component({
  imports: [Header, RouterLink],
  selector: 'app-imprint',
  styleUrl: './imprint.scss',
  templateUrl: './imprint.html',
})
export class Imprint {}
