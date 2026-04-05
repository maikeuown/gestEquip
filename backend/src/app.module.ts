import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { EquipmentModule } from './equipment/equipment.module';
import { EquipmentTypesModule } from './equipment-types/equipment-types.module';
import { RoomsModule } from './rooms/rooms.module';
import { MaintenanceModule } from './maintenance/maintenance.module';
import { MovementsModule } from './movements/movements.module';
import { RequestsModule } from './requests/requests.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { MessagesModule } from './messages/messages.module';
import { UploadModule } from './upload/upload.module';
import { AuditModule } from './audit/audit.module';
import { SchedulesModule } from './schedules/schedules.module';
import { FavoriteRoomsModule } from './favorite-rooms/favorite-rooms.module';
import { AssistanceRequestsModule } from './assistance-requests/assistance-requests.module';
import configuration from './config/configuration';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    InstitutionsModule,
    EquipmentModule,
    EquipmentTypesModule,
    RoomsModule,
    MaintenanceModule,
    MovementsModule,
    RequestsModule,
    NotificationsModule,
    ReportsModule,
    MessagesModule,
    UploadModule,
    AuditModule,
    SchedulesModule,
    FavoriteRoomsModule,
    AssistanceRequestsModule,
  ],
})
export class AppModule {}
