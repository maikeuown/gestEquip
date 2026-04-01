import { Module } from '@nestjs/common';
import { FavoriteRoomsService } from './favorite-rooms.service';
import { FavoriteRoomsController } from './favorite-rooms.controller';

@Module({ controllers: [FavoriteRoomsController], providers: [FavoriteRoomsService] })
export class FavoriteRoomsModule {}
