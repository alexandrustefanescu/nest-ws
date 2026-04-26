import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatIconModule } from '@angular/material/icon';

const COMMON_EMOJI = [
  '😀','😂','😍','🥰','😎','🤔','😅','😭','🥹','😤',
  '👍','👎','❤️','🔥','✨','🎉','👏','🙏','💯','🤝',
  '😊','🤣','😇','🥳','😢','😡','🤯','😴','🫡','💀',
  '🐶','🐱','🦊','🍕','🍔','☕','🎮','🏆','💡','🌙',
];

@Component({
  selector: 'app-message-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TextFieldModule, MatIconModule],
  styles: [`
    :host { display: block; position: relative; }

    .composer-wrap {
      display: flex; align-items: flex-end; gap: 8px;
      padding: 12px 16px;
      border-top: 1px solid var(--border-subtle);
      background: var(--surface-1b);
    }

    .composer-field {
      flex: 1; display: flex; align-items: flex-end;
      background: var(--surface-1); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md); padding: 10px 14px;
      transition: border-color var(--dur-fast) var(--ease-out);
    }
    .composer-field:focus-within { border-color: var(--accent); }

    textarea {
      flex: 1; resize: none; border: none; outline: none;
      background: transparent; font-family: inherit;
      font-size: 14px; line-height: 20px; color: var(--text-strong); width: 100%;
    }
    textarea::placeholder { color: var(--text-faint); }
    textarea:disabled { opacity: 0.5; cursor: not-allowed; }

    .emoji-btn, .send-btn {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      cursor: pointer; display: flex; align-items: center; justify-content: center;
      flex-shrink: 0; padding: 0;
      transition: opacity var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
    }

    .emoji-btn {
      background: var(--surface-2); font-size: 18px;
      border: 1px solid var(--border-subtle);
    }
    .emoji-btn:hover { background: var(--surface-1); }

    .send-btn {
      background: var(--accent); color: var(--accent-fg);
      box-shadow: inset 0 1px 0 oklch(100% 0 0 / 0.1);
    }
    .send-btn:disabled { opacity: 0.35; cursor: not-allowed; }
    .send-btn:not(:disabled):hover { opacity: 0.85; }

    .emoji-panel {
      position: absolute; bottom: calc(100% + 8px); left: 16px;
      background: var(--surface-1); border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md); padding: 8px;
      display: grid; grid-template-columns: repeat(10, 1fr); gap: 2px;
      box-shadow: 0 4px 16px oklch(0% 0 0 / 0.12); z-index: 50;
    }

    .ep-btn {
      width: 32px; height: 32px; border: none; background: none;
      cursor: pointer; font-size: 18px; border-radius: var(--radius-xs);
      display: flex; align-items: center; justify-content: center; padding: 0;
      transition: background var(--dur-fast) var(--ease-out);
    }
    .ep-btn:hover { background: var(--surface-2); }
  `],
  template: `
    @if (showEmojiPanel()) {
      <div class="emoji-panel" role="dialog" aria-label="Emoji picker">
        @for (emoji of commonEmoji; track emoji) {
          <button class="ep-btn" (click)="insertEmoji(emoji)" [attr.aria-label]="emoji">{{ emoji }}</button>
        }
      </div>
    }

    <div class="composer-wrap">
      <button
        class="emoji-btn"
        type="button"
        (click)="toggleEmojiPanel()"
        [attr.aria-expanded]="showEmojiPanel()"
        aria-label="Emoji picker"
      >😊</button>

      <div class="composer-field">
        <textarea
          #textarea
          [ngModel]="text()"
          (ngModelChange)="text.set($event)"
          [disabled]="disabled()"
          cdkTextareaAutosize
          cdkAutosizeMinRows="1"
          cdkAutosizeMaxRows="5"
          (keydown.enter)="onEnter($event)"
          (input)="onInput()"
          placeholder="Type a message…"
          aria-label="Message"
        ></textarea>
      </div>

      <button
        class="send-btn"
        [disabled]="disabled() || !text().trim()"
        (click)="send()"
        aria-label="Send message"
      >
        <mat-icon style="font-size:18px;width:18px;height:18px">send</mat-icon>
      </button>
    </div>
  `,
})
export class MessageComposerComponent {
  readonly disabled = input(false);
  readonly messageSent = output<string>();
  readonly typingChanged = output<boolean>();

  protected text = signal('');
  protected showEmojiPanel = signal(false);
  protected commonEmoji = COMMON_EMOJI;

  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');

  toggleEmojiPanel(): void {
    this.showEmojiPanel.update((v) => !v);
  }

  insertEmoji(emoji: string): void {
    const el = this.textareaRef()?.nativeElement;
    if (el) {
      const start = el.selectionStart ?? el.value.length;
      const end = el.selectionEnd ?? el.value.length;
      const current = this.text();
      this.text.set(current.slice(0, start) + emoji + current.slice(end));
      setTimeout(() => {
        el.selectionStart = el.selectionEnd = start + [...emoji].length;
        el.focus();
      });
    } else {
      this.text.update((v) => v + emoji);
    }
    this.showEmojiPanel.set(false);
    this.typingChanged.emit(true);
  }

  onEnter(event: Event): void {
    const ke = event as KeyboardEvent;
    if (ke.shiftKey) return;
    ke.preventDefault();
    this.send();
  }

  onInput(): void {
    this.typingChanged.emit(this.text().length > 0);
  }

  send(): void {
    const trimmed = this.text().trim();
    if (!trimmed || this.disabled()) return;
    this.messageSent.emit(trimmed);
    this.text.set('');
    this.typingChanged.emit(false);
  }
}
