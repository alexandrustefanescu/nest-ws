import { Entity, ManyToOne, PrimaryKey, Property, Unique } from '@mikro-orm/core';
import { Message } from './message.entity';

@Entity({ tableName: 'message_reactions' })
@Unique({ properties: ['message', 'userId', 'emoji'] })
export class MessageReaction {
  @PrimaryKey()
  id!: number;

  @ManyToOne(() => Message, { deleteRule: 'cascade' })
  message!: Message;

  @Property()
  userId!: string;

  @Property()
  emoji!: string;
}
