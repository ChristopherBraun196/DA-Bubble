import { Component } from '@angular/core';
import { Header } from '../shared/header/header';

@Component({
  imports: [Header],
  selector: 'app-register',
  styleUrl: './register.scss',
  templateUrl: './register.html',
})
export class Register {}
