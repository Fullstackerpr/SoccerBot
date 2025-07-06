import { Injectable } from '@nestjs/common';
import { InjectBot } from 'nestjs-telegraf';
import { MyContex, MyContext, StadiumDataState } from 'src/helpers/sesion';
import { PrismaService } from 'src/prisma/prisma.service';
import { Markup, Scenes, Telegraf } from 'telegraf';
import { InlineKeyboardButton } from 'typegram';

interface IContext extends Scenes.WizardContext {
  stadiumData?: any;
  pagr?: number;
}

@Injectable()
export class BotService {
  // Creted(ctx: MyContex) {
  //   throw new Error('Method not implemented.');
  // }
  constructor(private readonly prisma: PrismaService
  ) {
  }

  async stadionCreted(ctx: MyContex) {
    try {
      const { location, phone, image, price, description, region, menigerid } =
        ctx.session.stadion;

      if (
        !location ||
        !phone ||
        !image ||
        !description ||
        !region ||
        !menigerid
      ) {
        ctx.reply(
          "Malumotlar to'liq emas. Qaytadan kiriting",
          Markup.keyboard([['Ortga']]).resize(),
        );
        return;
      }

      await this.prisma.stadion.create({
        data: {
          phone,
          image,
          price: Number(price),
          description,
          region,
          status: true,
          menijer_chat_id: menigerid,

          latitude: Number(location.split(',')[0]),
          longitude: Number(location.split('')[1]),
        },
      });

      ctx.reply(
        '✅ Ma’lumotlar muvaffaqiyatli saqlandi',
        Markup.keyboard([['Ortga']]).resize(),
      );
      ctx.session.stadion = {
        phone: null,
        location: null,
        region: null,
        description: null,
        price: null,
        image: null,
        menigerid: null,
      };
    } catch (error) {
      ctx.reply("❌ Xatolik yuz berdi. Iltimos, keyinroq urinib ko'ring.");
    }
  }

  async Creted(ctx: IContext) {
    try {
      const state = ctx.wizard.state as StadiumDataState;
      const {
        name,
        description,
        price,
        region,
        latitude,
        longitude,
        image,
        menijer_chat_id,
        phone,
      } = state.stadiumData;
      if (
        !name ||
        !description ||
        !phone ||
        !price ||
        !region ||
        !latitude ||
        !longitude ||
        !image ||
        !menijer_chat_id
      ) {
        ctx.reply("Malumotlar to'liq emas iltimos qaytadan kriting.");
        const state = ctx.wizard.state as StadiumDataState;
        state.stadiumData = {};
        return;
      }
      await this.prisma.stadion.create({
        data: {
          description,
          price,
          region,
          latitude,
          longitude,
          image,
          menijer_chat_id: String(menijer_chat_id),
          phone,
        },
      });
      ctx.reply('✅ Bazaga saqlandi.');
      state.stadiumData = {};
    } catch (error) {
      console.log(error);

      ctx.reply("❌ Xatolik yuz berdi, iltimos keyinroq urinib ko'ring");
    }
  }

  async FindAllAdmin(ctx: MyContex) {
    try {
      const data = await this.prisma.stadion.findMany();
      if (!data.length)
        return ctx.reply('🤷‍♂️ Hozirda hech qanday stadion mavjud emas.');

      for (const stadion of data) {
        await ctx.replyWithLocation(stadion.latitude, stadion.longitude);

        const msg = `
📍 <b>Region:</b> ${stadion.region}
📞 <b>Tel:</b> ${stadion.phone}
💬 <b>Tavsif:</b> ${stadion.description}
💰 <b>Narx:</b> ${stadion.price} so'm
✅ <b>Status:</b> ${stadion.status ? 'Faol' : 'Faol emas'}
🆔 <b>ID:</b> ${stadion.id}`;

        await ctx.replyWithPhoto(stadion.image, {
          caption: msg,
          parse_mode: 'HTML',
        });
      }
    } catch (error) {
      ctx.reply("❌ Xatolik yuz berdi. Keyinroq urinib ko'ring.");
    }
  }

  async showPage(ctx: MyContex) {
    const limit = 2;
    const page = ctx.session.page || 0;
    const skip = page * limit;

    const total = await this.prisma.stadion.count();
    const data = await this.prisma.stadion.findMany({ skip, take: limit });

    if (!data.length) return ctx.reply('🤷‍♂️ Stadionlar topilmadi.');

    for (const stadion of data) {
      await ctx.replyWithLocation(stadion.latitude, stadion.longitude);

      const msg = `
📍 <b>Region:</b> ${stadion.region}
📞 <b>Tel:</b> ${stadion.phone}
💬 <b>Tavsif:</b> ${stadion.description}
💰 <b>Narx:</b> ${stadion.price} so'm
✅ <b>Status:</b> ${stadion.status ? 'Faol' : 'Faol emas'}
🆔 <b>ID:</b> ${stadion.id}`;

      await ctx.replyWithPhoto(stadion.image, {
        caption: msg,
        parse_mode: 'HTML',
      });
    }

    const buttons: InlineKeyboardButton[] = [];
    if (page > 0) buttons.push({ text: '⬅️ Oldingi', callback_data: 'prev' });
    if ((page + 1) * limit < total)
      buttons.push({ text: '➡️ Keyingi', callback_data: 'next' });

    if (buttons.length) {
      await ctx.reply('⬇️ Sahifani boshqarish:', {
        reply_markup: {
          inline_keyboard: [buttons],
        },
      });
    }
  }

  async findAllZakas(ctx: MyContex) {
    const bookings = await this.prisma.booking.findMany({
      include: { stadion: true, user: true },
    });

    if (!bookings.length)
      return ctx.reply('Hozircha hech qanday zakaz mavjud emas.');

    for (const booking of bookings) {
      const msg = `
📍 <b>Stadion:</b> ${booking.stadion.region}
🗓 <b>Sana:</b> ${booking.dey}
⏰ <b>Soat:</b> ${booking.time}
👤 <b>Foydalanuvchi:</b> ${booking.user.name}
📞 <b>Tel:</b> ${booking.user.phone}
🆔 <b>Chat ID:</b> ${booking.user.chet_id}`;

      await ctx.reply(msg, { parse_mode: 'HTML' });
    }
  }

  async findStadionMalumotlari(ctx: MyContex) {
    const chatId = String(ctx.from?.id);
    const stadion = await this.prisma.stadion.findFirst({
      where: { menijer_chat_id: chatId },
    });

    if (!stadion) return ctx.reply('Sizga biriktirilgan stadion topilmadi.');

    await ctx.replyWithLocation(stadion.latitude, stadion.longitude);

    const msg = `
📍 <b>Region:</b> ${stadion.region}
📞 <b>Tel:</b> ${stadion.phone}
💬 <b>Tavsif:</b> ${stadion.description}
💰 <b>Narx:</b> ${stadion.price} so'm
✅ <b>Status:</b> ${stadion.status ? 'Faol' : 'Faol emas'}
🆔 <b>ID:</b> ${stadion.id}`;

    await ctx.replyWithPhoto(stadion.image, {
      caption: msg,
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '✏️ Tahrirlash',
              callback_data: `edit_Ubdate_${stadion.id}`,
            },
          ],
        ],
      },
    });
  }

  async findStadionVaqtlari() {}
}
