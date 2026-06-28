import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { FeaturesModule } from '../features/features.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [AuthModule, FeaturesModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule { }
