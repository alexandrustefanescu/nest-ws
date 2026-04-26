import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { IdentityService } from '../../chat/identity.service';

@Component({
  selector: 'app-onboarding',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  styles: [`
    :host {
      display: flex;
      min-height: 100dvh;
      align-items: center;
      justify-content: center;
      background-color: var(--surface-0);
    }

    .panel {
      width: 100%;
      max-width: 400px;
      padding: 2rem;
      background: var(--surface-1);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      animation: message-in 300ms var(--ease-out) both;
    }

    .monogram {
      width: 40px;
      height: 40px;
      border-radius: var(--radius-sm);
      background: var(--accent);
      color: var(--accent-fg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 18px;
      margin-bottom: 1.25rem;
    }

    h1 {
      font-size: 32px;
      line-height: 38px;
      font-weight: 700;
      letter-spacing: -0.03em;
      color: var(--text-strong);
      margin: 0 0 0.375rem;
    }

    .subtitle {
      font-size: 14px;
      line-height: 20px;
      color: var(--text-muted);
      margin: 0 0 1.5rem;
    }

    mat-form-field {
      width: 100%;
    }

    .submit-btn {
      width: 100%;
      height: 44px;
      margin-top: 0.75rem;
      border-radius: var(--radius-md) !important;
      background: var(--accent) !important;
      color: var(--accent-fg) !important;
      font-weight: 600;
      font-size: 14px;
      box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.08) !important;
    }

    .submit-btn:disabled {
      opacity: 0.5;
    }
  `],
  template: `
    <div class="panel">
      <div class="monogram">C</div>
      <h1>Welcome to Chat 👋</h1>
      <p class="subtitle">Pick a display name to get started</p>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Your name</mat-label>
          <input matInput formControlName="name" autocomplete="nickname" />
          <mat-hint>This is how others will see you.</mat-hint>
          @if (form.controls.name.invalid && form.controls.name.touched) {
            <mat-error>Please enter a name</mat-error>
          }
        </mat-form-field>

        <button
          mat-flat-button
          type="submit"
          class="submit-btn"
          [disabled]="form.invalid"
        >
          Enter chat ›
        </button>
      </form>
    </div>
  `,
})
export class OnboardingPage {
  private readonly identity = inject(IdentityService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(1)]],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.identity.setUserId(this.form.value.name!);
    this.router.navigate(['/']);
  }
}
