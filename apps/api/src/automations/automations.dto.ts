import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AutomationTrigger } from '@autonode/database';

/**
 * `conditions` shape: { keywords: string[], matchType: 'any' | 'all' }
 * `actions` shape:    Array<
 *   | { type: 'send_dm'; text: string }
 *   | { type: 'delay'; seconds: number }
 *   | { type: 'add_label'; label: string }
 *   | { type: 'set_stage'; stage: LeadStage }
 * >
 * Both are validated structurally at runtime in the service.
 */
export class CreateAutomationDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ enum: AutomationTrigger })
  @IsEnum(AutomationTrigger)
  trigger!: AutomationTrigger;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channelId?: string;

  @ApiProperty({ type: Object, description: '{ keywords: string[], matchType: "any" | "all" }' })
  @IsObject()
  @Type(() => Object) // keep raw JSON intact under whitelist/transform
  conditions!: Record<string, unknown>;

  @ApiProperty({ type: [Object], description: 'Ordered action steps' })
  @IsArray()
  @Type(() => Object) // preserve action objects (validated by zod in the service)
  actions!: unknown[];
}

export class UpdateAutomationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ enum: AutomationTrigger })
  @IsOptional()
  @IsEnum(AutomationTrigger)
  trigger?: AutomationTrigger;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  channelId?: string | null;

  @ApiPropertyOptional({ type: Object })
  @IsOptional()
  @IsObject()
  @Type(() => Object)
  conditions?: Record<string, unknown>;

  @ApiPropertyOptional({ type: [Object] })
  @IsOptional()
  @IsArray()
  @Type(() => Object)
  actions?: unknown[];
}
