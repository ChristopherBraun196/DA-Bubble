import { Component, signal } from '@angular/core';
import { Header } from '../shared/header/header';
import { RouterLink } from '@angular/router';
import { FormGroup, FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  imports: [Header, RouterLink, ReactiveFormsModule],
  selector: 'app-password-reset',
  styleUrl: './password-reset.scss',
  templateUrl: './password-reset.html',
})
export class PasswordReset {
  form = new FormGroup({
    email: new FormControl(''),
  });

  clearLoginError() {}
  onSubmit() {}
}
