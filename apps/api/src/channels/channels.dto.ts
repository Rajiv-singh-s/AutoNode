import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ChannelStatus, ChannelType } from '@autonode/database';

export class ConnectChannelDto {
  @ApiProperty({ enum: ChannelType })
  @IsEnum(ChannelType)
  type!: ChannelType;

  @ApiProperty({ description: 'External ID from Meta (IG user id / FB page id / WA phone number id)' })
  @IsString()
  @MaxLength(100)
  externalId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  avatarUrl?: string;

  @ApiProperty({ description: 'Meta access token (will be encrypted at rest)' })
  @IsString()
  accessToken!: string;

  @ApiPropertyOptional({ description: 'Facebook Page ID (for Messenger/IG)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  pageId?: string;

  @ApiPropertyOptional({ description: 'WhatsApp Business Account ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  wabaId?: string;

  @ApiPropertyOptional({ description: 'WhatsApp phone number ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  phoneNumberId?: string;
}

export class UpdateChannelDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: ChannelStatus })
  @IsOptional()
  @IsEnum(ChannelStatus)
  status?: ChannelStatus;

  @ApiPropertyOptional({ description: 'Rotate the Meta access token' })
  @IsOptional()
  @IsString()
  accessToken?: string;
}
