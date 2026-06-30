import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { TeamService } from './team.service';
import { CurrentUser, OrgId } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { InviteMemberDto, UpdateMemberRoleDto } from './team.dto';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('team')
@ApiBearerAuth()
@Controller('team')
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get('members')
  @ApiOperation({ summary: 'List organization members' })
  listMembers(@OrgId() orgId: string) {
    return this.team.listMembers(orgId);
  }

  @Get('invitations')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'List pending invitations' })
  listInvitations(@OrgId() orgId: string) {
    return this.team.listInvitations(orgId);
  }

  @Post('invitations')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Invite a new team member' })
  invite(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InviteMemberDto,
  ) {
    return this.team.invite(orgId, user.sub, dto);
  }

  @Post('invitations/:token/accept')
  @HttpCode(200)
  @ApiOperation({ summary: 'Accept an invitation (for the invited user)' })
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.team.acceptInvitation(token, user.sub);
  }

  @Delete('invitations/:id')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Revoke a pending invitation' })
  revokeInvitation(@OrgId() orgId: string, @Param('id') id: string) {
    return this.team.revokeInvitation(orgId, id);
  }

  @Patch('members/:membershipId/role')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: "Update a member's role" })
  updateRole(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMemberRoleDto,
  ) {
    return this.team.updateRole(orgId, membershipId, user.sub, dto);
  }

  @Delete('members/:membershipId')
  @Roles('OWNER', 'ADMIN')
  @HttpCode(200)
  @ApiOperation({ summary: 'Remove a member from the organization' })
  removeMember(
    @OrgId() orgId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Param('membershipId') membershipId: string,
  ) {
    return this.team.removeMember(orgId, membershipId, user.sub);
  }
}
