import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { InterviewModule } from './interview/interview.module';
import { CandidateModule } from './candidate/candidate.module';
import { MailModule } from './mail/mail.module';
import { AiModule } from './ai/ai.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    InterviewModule,
    CandidateModule,
    MailModule,
    AiModule,
  ],
})
export class AppModule {}
