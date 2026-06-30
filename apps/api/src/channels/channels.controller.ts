import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChannelsService } from './channels.service';
import { OrgId } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { ConnectChannelDto, UpdateChannelDto } from './channels.dto';

@ApiTags('channels')
@ApiBearerAuth()
@Controller('channels')
export class ChannelsController {
  constructor(private readonly channels: ChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'List connected channels' })
  list(@OrgId() orgId: string) {
    return this.channels.list(orgId);
  }

  @Get('health')
  @ApiOperation({ summary: 'Channel health summary' })
  health(@OrgId() orgId: string) {
    return this.channels.healthSummary(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a channel' })
  getOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.channels.getOne(orgId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Connect a new Meta channel' })
  connect(@OrgId() orgId: string, @Body() dto: ConnectChannelDto) {
    return this.channels.connect(orgId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update channel name/status/token' })
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: UpdateChannelDto) {
    return this.channels.update(orgId, id, dto);
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Disconnect and remove a channel' })
  disconnect(@OrgId() orgId: string, @Param('id') id: string) {
    return this.channels.disconnect(orgId, id);
  }
}
