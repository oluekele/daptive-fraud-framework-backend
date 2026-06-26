import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface';
import { GenerateFeaturesDto } from './dto/generate-features.dto';
import { GenerateFeaturesAllDto } from './dto/generate-features-all.dto';
import { ExportTrainingVectorsDto } from './dto/export-training-vectors.dto';
import { FeaturesService } from './features.service';

@ApiTags('features')
@Controller('features')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FeaturesController {
  constructor(private readonly features: FeaturesService) {}

  @Post('generate')
  @ApiOperation({
    summary: 'Generate and store behavioral features for a session',
  })
  @ApiCreatedResponse({ description: 'Features generated and stored.' })
  generateFeatures(
    @Body() dto: GenerateFeaturesDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.features.generateAndStoreFeatures(
      req.user!.userId,
      dto.sessionId ?? req.user!.sessionId,
    );
  }

  @Post('generate/all')
  @ApiOperation({
    summary:
      'Backfill behavioral features for all sessions owned by the authenticated user',
  })
  @ApiCreatedResponse({ description: 'Features generated for all sessions.' })
  generateAllFeatures(
    @Body() dto: GenerateFeaturesAllDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.features.generateAndStoreFeaturesForAllSessions(
      req.user!.userId,
    );
  }

  @Get('training-vector')
  @ApiOperation({
    summary: 'Return ML training vector wrapper for the active session',
  })
  @ApiOkResponse({ description: 'Training vector returned.' })
  trainingVector(@Req() req: AuthenticatedRequest) {
    return this.features.getTrainingVectorWrapper(
      req.user!.userId,
      req.user!.sessionId,
    );
  }

  @Post('training-vector/all')
  @ApiOperation({
    summary:
      'Export ML training vectors for all sessions owned by the authenticated user',
  })
  @ApiOkResponse({ description: 'Training vectors returned.' })
  trainingVectorAll(
    @Body() dto: ExportTrainingVectorsDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.features.getTrainingVectorWrappersForAllSessions(
      req.user!.userId,
      dto?.onlyLabeled ?? false,
    );
  }

  @Get('training-summary')
  @ApiOperation({
    summary: 'Return the flattened ML training summary for the active session',
  })
  @ApiOkResponse({ description: 'Training summary returned.' })
  trainingSummary(@Req() req: AuthenticatedRequest) {
    return this.features.getTrainingSummary(
      req.user!.userId,
      req.user!.sessionId,
    );
  }

  @Get('export/csv')
  @ApiOperation({
    summary: 'Export training summaries for the authenticated user as CSV',
  })
  @ApiOkResponse({ description: 'CSV export returned.' })
  async exportCsv(
    @Req() req: AuthenticatedRequest,
    @Query('onlyLabeled') onlyLabeled: string | undefined,
    @Res({ passthrough: true }) res: any,
  ) {
    const csv = await this.features.exportTrainingCsv(
      req.user!.userId,
      onlyLabeled === 'true',
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="training-data.csv"',
    );

    return csv;
  }

  @Post('training-summary/all')
  @ApiOperation({
    summary:
      'Return flattened ML training summaries for all sessions owned by the authenticated user',
  })
  @ApiOkResponse({ description: 'Training summaries returned.' })
  trainingSummaryAll(@Req() req: AuthenticatedRequest) {
    return this.features.getTrainingSummariesForAllSessions(req.user!.userId);
  }

  @Get()
  @ApiOperation({ summary: 'Retrieve stored features for the active session' })
  @ApiOkResponse({ description: 'Stored features returned.' })
  retrieveActiveSessionFeatures(@Req() req: AuthenticatedRequest) {
    return this.features.retrieveFeatures(
      req.user!.userId,
      req.user!.sessionId,
    );
  }

  @Delete('session/:sessionId')
  @ApiOperation({ summary: 'Delete stored features for an owned session' })
  @ApiOkResponse({ description: 'Features deleted.' })
  deleteFeature(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.features.deleteFeature(req.user!.userId, sessionId);
  }

  @Get('session/:sessionId')
  @ApiOperation({ summary: 'Retrieve stored features by owned session' })
  @ApiOkResponse({ description: 'Stored features returned.' })
  retrieveFeatures(
    @Param('sessionId') sessionId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.features.retrieveFeatures(req.user!.userId, sessionId);
  }
}
