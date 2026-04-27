import { Controller, Get, Post, Body, Delete, Param, ParseIntPipe } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { RoomService } from '../services/room.service';
import { Room } from '../modules/rooms/room.entity';
import { CreateRoomDto } from '../modules/rooms/dto/create-room.dto';

@ApiTags('rooms')
@Controller('api/rooms')
export class RoomsController {
  constructor(private readonly roomService: RoomService) {}

  @Get()
  @ApiOperation({ summary: 'Get all rooms' })
  @ApiResponse({ status: 200, type: [Room], description: 'List of all rooms' })
  async getAllRooms(): Promise<Room[]> {
    return this.roomService.getAllRooms();
  }

  @Post()
  @ApiOperation({ summary: 'Create a new room' })
  @ApiResponse({ status: 201, type: Room, description: 'Room created' })
  async createRoom(@Body() dto: CreateRoomDto): Promise<Room> {
    return this.roomService.createRoom(dto.name.trim());
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a room' })
  @ApiResponse({ status: 200, description: 'Room deleted' })
  async deleteRoom(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.roomService.deleteRoom(id);
  }
}