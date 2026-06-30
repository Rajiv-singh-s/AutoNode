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
import { AutomationsService } from './automations.service';
import { OrgId } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { CreateAutomationDto, UpdateAutomationDto } from './automations.dto';

@ApiTags('automations')
@ApiBearerAuth()
@Controller('automations')
export class AutomationsController {
  constructor(private readonly automations: AutomationsService) {}

  @Get()
  @ApiOperation({ summary: 'List automations' })
  list(@OrgId() orgId: string) {
    return this.automations.list(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an automation' })
  getOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.automations.getOne(orgId, id);
  }

  @Get(':id/runs')
  @ApiOperation({ summary: 'List recent automation runs' })
  runs(@OrgId() orgId: string, @Param('id') id: string) {
    return this.automations.listRuns(orgId, id);
  }

  @Post()
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Create an automation' })
  create(@OrgId() orgId: string, @Body() dto: CreateAutomationDto) {
    return this.automations.create(orgId, dto);
  }

  @Patch(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Update an automation' })
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: UpdateAutomationDto) {
    return this.automations.update(orgId, id, dto);
  }

  @Patch(':id/enabled')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Enable or disable an automation' })
  setEnabled(@OrgId() orgId: string, @Param('id') id: string, @Body() body: { enabled: boolean }) {
    return this.automations.setEnabled(orgId, id, Boolean(body.enabled));
  }

  @Delete(':id')
  @Roles('OWNER', 'ADMIN', 'MANAGER')
  @ApiOperation({ summary: 'Delete an automation' })
  remove(@OrgId() orgId: string, @Param('id') id: string) {
    return this.automations.remove(orgId, id);
  }
}
