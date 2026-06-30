import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { InboxService } from './inbox.service';
import { CurrentUser, OrgId } from '../auth/current-user.decorator';
import {
  AddNoteDto,
  ListConversationsQueryDto,
  SendMessageDto,
  UpdateConversationDto,
} from './inbox.dto';

@ApiTags('inbox')
@ApiBearerAuth()
@Controller('conversations')
export class InboxController {
  constructor(private readonly inbox: InboxService) {}

  @Get()
  @ApiOperation({ summary: 'List conversations (cursor paginated, filterable)' })
  list(@OrgId() orgId: string, @Query() query: ListConversationsQueryDto) {
    return this.inbox.list(orgId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a conversation with messages, notes and labels' })
  getOne(@OrgId() orgId: string, @Param('id') id: string) {
    return this.inbox.getOne(orgId, id);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Mark a conversation as read' })
  markRead(@OrgId() orgId: string, @Param('id') id: string) {
    return this.inbox.markRead(orgId, id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'Send an outbound message via the connected channel' })
  send(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.inbox.sendMessage(orgId, id, userId, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update status, priority or assignment' })
  update(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: UpdateConversationDto,
  ) {
    return this.inbox.update(orgId, id, dto);
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add an internal note' })
  addNote(
    @OrgId() orgId: string,
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: AddNoteDto,
  ) {
    return this.inbox.addNote(orgId, id, userId, dto);
  }
}
