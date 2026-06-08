import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
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

  @Get()
  @ApiOperation({ summary: 'Retrieve stored features for the active session' })
  @ApiOkResponse({ description: 'Stored features returned.' })
  retrieveActiveSessionFeatures(@Req() req: AuthenticatedRequest) {
    return this.features.retrieveFeatures(
      req.user!.userId,
      req.user!.sessionId,
    );
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
