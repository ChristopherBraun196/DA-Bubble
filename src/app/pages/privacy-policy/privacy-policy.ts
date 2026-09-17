import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Header } from '../login/shared/header/header';

@Component({
  imports: [RouterLink, Header],
  selector: 'app-privacy-policy',
  styleUrl: './privacy-policy.scss',
  templateUrl: './privacy-policy.html',
})
export class PrivacyPolicy {}
