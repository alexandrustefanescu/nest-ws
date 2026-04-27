import { Controller, Get, Post, Body, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomsService } from './rooms.service';
import { Room } from './room.entity';
import { CreateRoomDto } from './dto/create-room.dto';

@ApiTags('rooms')
@Controller('api/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, type: [Room], description: 'List of all rooms' })
  async getAllRooms(): Promise<Room[]> {
    return this.roomsService.getAllRooms();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({ status: 201, type: Room, description: 'Room created' })
  async createRoom(@Body() dto: CreateRoomDto): Promise<Room> {
    return this.roomsService.createRoom(dto.name.trim());
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 200, description: 'Room deleted' })
  async deleteRoom(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.roomsService.deleteRoom(id);
  }
}
