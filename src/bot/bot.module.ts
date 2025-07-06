import { Module } from '@nestjs/common';
import { TelegrafModule } from 'nestjs-telegraf';
import { AddStadiumWizard, BotUpdate } from './bot.update';
import { BotService } from './bot.service';

@Module({
  providers: [BotUpdate, BotService, AddStadiumWizard],
})

export class BotModule {}
