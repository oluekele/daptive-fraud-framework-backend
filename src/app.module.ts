import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { SessionsModule } from './sessions/sessions.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { PrismaModule } from './prisma/prisma.module';
import { FeaturesModule } from './features/features.module';
import { PredictController } from './predict/predict.controller';
import { RiskModule } from './risk/risk.module';
import { MlPredictionService } from './predict/ml-prediction.service';



@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', 'backend/nestjs-api/.env'],
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    SessionsModule,
    TelemetryModule,
    FeaturesModule,
    RiskModule,
  ],
  controllers: [AppController, PredictController],
  providers: [AppService, MlPredictionService],
})
export class AppModule { }

