import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthResponseDto } from './dto/health.dto';

@ApiTags('health')
@Controller()
export class HealthController {
  @Get('/health')
  @ApiOperation({ summary: 'Check service health' })
  @ApiResponse({ status: 200, type: HealthResponseDto, description: 'Service is healthy' })
  health(): HealthResponseDto {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }
}
