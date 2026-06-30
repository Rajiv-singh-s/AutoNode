import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { OrgId } from '../auth/current-user.decorator';
import { ListContactsQueryDto, UpdateContactDto } from './contacts.dto';

@ApiTags('contacts')
@ApiBearerAuth()
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contacts: ContactsService) {}

  @Get()
  @ApiOperation({ summary: 'List leads/contacts (cursor paginated, filterable)' })
  list(@OrgId() orgId: string, @Query() query: ListContactsQueryDto) {
    return this.contacts.list(orgId, query);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Contacts grouped by lead stage for the pipeline board' })
  pipeline(@OrgId() orgId: string) {
    return this.contacts.pipeline(orgId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a contact with recent conversations' })
  getOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contacts.getOne(orgId, id);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'List recent activities for a contact' })
  activities(@OrgId() orgId: string, @Param('id') id: string) {
    return this.contacts.listActivities(orgId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update lead stage, score, value, tags or contact details' })
  update(@OrgId() orgId: string, @Param('id') id: string, @Body() dto: UpdateContactDto) {
    return this.contacts.update(orgId, id, dto);
  }
}
