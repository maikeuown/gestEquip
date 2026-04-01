import { Module } from '@nestjs/common';
import { AssistanceRequestsService } from './assistance-requests.service';
import { AssistanceRequestsController } from './assistance-requests.controller';

@Module({ controllers: [AssistanceRequestsController], providers: [AssistanceRequestsService] })
export class AssistanceRequestsModule {}
