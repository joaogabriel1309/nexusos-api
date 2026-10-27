import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from './common/db';
import { AuthGuard, SecurityModule } from './common/security';
@Module({ imports: [DatabaseModule, SecurityModule], providers: [ { provide: APP_GUARD, useClass: AuthGuard }] })
export class AppModule {}
