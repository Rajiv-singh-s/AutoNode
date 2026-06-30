import { IsEmail, IsEnum, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrgRole } from '@autonode/database';

export class InviteMemberDto {
  @ApiProperty({ example: 'colleague@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: OrgRole, default: OrgRole.SALES })
  @IsEnum(OrgRole)
  role!: OrgRole;
}

export class UpdateMemberRoleDto {
  @ApiProperty({ enum: OrgRole })
  @IsEnum(OrgRole)
  role!: OrgRole;
}
