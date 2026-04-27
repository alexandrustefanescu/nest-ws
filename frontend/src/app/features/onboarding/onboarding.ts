import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { Identity } from '../../core/identity/identity';

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  styleUrl: './onboarding.css',
  templateUrl: './onboarding.html',
})
export class Onboarding implements OnInit {
  private readonly identity = inject(Identity);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
  });

  ngOnInit(): void {
    if (this.identity.userId()) {
      this.router.navigate(['/']);
      return;
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    this.identity.setUserId(this.form.value.name!);
    this.router.navigate(['/']);
  }
}
