import { ChangeDetectionStrategy, Component, ElementRef, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';

const COMMON_EMOJI = [
  '😀','😂','😍','🥰','😎','🤔','😅','😭','🥹','😤',
  '👍','👎','❤️','🔥','✨','🎉','👏','🙏','💯','🤝',
  '😊','🤣','😇','🥳','😢','😡','🤯','😴','🫡','💀',
  '🐶','🐱','🦊','🍕','🍔','☕','🎮','🏆','💡','🌙',
];

@Component({
  selector: 'app-message-composer',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TextFieldModule, MatIconModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatMenuModule],
  templateUrl: './message-composer.html',
  host: {
    class: 'block',
  },
})
export class MessageComposer {
  readonly disabled = input(false);
  readonly messageSent = output<string>();
  readonly typingChanged = output<boolean>();

  protected text = signal('');
  protected commonEmoji = COMMON_EMOJI;

  private readonly textareaRef = viewChild<ElementRef<HTMLTextAreaElement>>('textarea');
  private readonly emojiTrigger = viewChild(MatMenuTrigger);

  insertEmoji(emoji: string): void {
    const current = this.text();
    this.text.set(current + emoji);
    this.emojiTrigger()?.closeMenu();
    this.typingChanged.emit(true);

    setTimeout(() => {
      const el = this.textareaRef()?.nativeElement;
      if (el) {
        el.focus();
        el.selectionStart = el.selectionEnd = current.length + 1;
      }
    }, 0);
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
