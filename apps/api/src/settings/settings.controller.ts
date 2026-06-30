import {
  Body,
  Controller,
  Get,
  HttpCode,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SettingsService } from './settings.service';
import { CurrentUser, OrgId } from '../auth/current-user.decorator';
import { Roles } from '../auth/roles.decorator';
import { UpdateOrganizationDto, UpdatePasswordDto, UpdateProfileDto } from './settings.dto';
import type { AuthenticatedUser } from '../auth/auth.types';

@ApiTags('settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settings: SettingsService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get the current user profile' })
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.settings.getProfile(user.sub);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update name and avatar' })
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.settings.updateProfile(user.sub, dto);
  }

  @Post('profile/password')
  @HttpCode(200)
  @ApiOperation({ summary: 'Change password (requires current password)' })
  updatePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePasswordDto) {
    return this.settings.updatePassword(user.sub, dto);
  }

  @Get('organization')
  @ApiOperation({ summary: 'Get organization details and plan info' })
  getOrganization(@OrgId() orgId: string) {
    return this.settings.getOrganization(orgId);
  }

  @Patch('organization')
  @Roles('OWNER', 'ADMIN')
  @ApiOperation({ summary: 'Update organization name and logo' })
  updateOrganization(@OrgId() orgId: string, @Body() dto: UpdateOrganizationDto) {
    return this.settings.updateOrganization(orgId, dto);
  }
}
