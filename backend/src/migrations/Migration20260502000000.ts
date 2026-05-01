import { Migration } from '@mikro-orm/migrations';

export class Migration20260502000000 extends Migration {
  override up(): void {
    this.addSql(
      `create index \`notifications_recipient_id_index\` on \`notifications\` (\`recipient_id\`);`,
    );
  }

  override down(): void {
    this.addSql(
      `drop index if exists \`notifications_recipient_id_index\`;`,
    );
  }
}
