import { Controller, Get, Patch, Post, Param, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { ListNotificationsDto } from './dto/list-notifications.dto';

@ApiTags('notifications')
@Controller('api/notifications')
export class NotificationsController {
  constructor(private readonly svc: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'List notifications for a user' })
  async list(@Query() dto: ListNotificationsDto) {
    const items = await this.svc.listForUser(dto.userId, dto.before, dto.limit);
    return {
      notifications: items.map((n) => ({
        id: n.id,
        type: n.type,
        actorId: n.actorId,
        postId: n.postId,
        postTitle: n.post?.title ?? '',
        read: n.read,
        createdAt: n.createdAt,
      })),
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiQuery({ name: 'userId', type: String })
  async unreadCount(@Query('userId') userId: string) {
    const count = await this.svc.getUnreadCount(userId);
    return { count };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiQuery({ name: 'userId', type: String })
  async markRead(
    @Param('id', ParseIntPipe) id: number,
    @Query('userId') userId: string,
  ) {
    await this.svc.markRead(userId, id);
    return { ok: true };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiQuery({ name: 'userId', type: String })
  async markAllRead(@Query('userId') userId: string) {
    await this.svc.markAllRead(userId);
    return { ok: true };
  }
}
