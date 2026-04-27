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
  styleUrl: './message-composer.css',
  templateUrl: './message-composer.html',
})
export class MessageComposer {
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
    const current = this.text();
    this.text.set(current + emoji);
    this.showEmojiPanel.set(false);
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
