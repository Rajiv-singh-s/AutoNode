import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { AiOrchestratorService } from './ai.service';
import { OrgId } from '../auth/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { ForbiddenException } from '@nestjs/common';

class SuggestRepliesDto {
  @IsOptional()
  @IsString()
  @MaxLength(280)
  instruction?: string;
}

@ApiTags('ai')
@ApiBearerAuth()
@Controller('ai')
export class AiController {
  constructor(
    private readonly ai: AiOrchestratorService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('conversations/:id/suggest-replies')
  @ApiOperation({ summary: 'Generate suggested replies for a conversation' })
  async suggest(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body() dto: SuggestRepliesDto,
  ): Promise<{ replies: string[] }> {
    await this.assertOwnership(orgId, id);
    const replies = await this.ai.suggestReplies(id, dto.instruction);
    await this.prisma.conversation.update({
      where: { id },
      data: { aiSuggestedReplies: replies },
    });
    return { replies };
  }

  @Post('conversations/:id/reanalyze')
  @ApiOperation({ summary: 'Re-run AI analysis for a conversation' })
  async reanalyze(@OrgId() orgId: string, @Param('id') id: string): Promise<{ queued: true }> {
    await this.assertOwnership(orgId, id);
    await this.ai.queueAnalysis(id);
    return { queued: true };
  }

  private async assertOwnership(orgId: string, conversationId: string): Promise<void> {
    const convo = await this.prisma.conversation.findFirst({
      where: { id: conversationId, organizationId: orgId },
      select: { id: true },
    });
    if (!convo) throw new ForbiddenException('Conversation not found in your organization');
  }
}
