import {
  Ctx,
  Start,
  Update,
  Hears,
  On,
  Action,
  WizardStep,
  Wizard,
  Command,
  Next,
} from "nestjs-telegraf";
import { Context, Markup, Scenes } from "telegraf";
import { BotService } from "./bot.service";
import { MyContex, MyContext, StadiumDataState } from "src/helpers/sesion";
import { PrismaService } from "src/prisma/prisma.service";

interface MyScenes extends Scenes.WizardContext {
  ABS: string | null;
  page: number;
  stadiumData?: any;
}

@Update()
export class BotUpdate {
  private readonly ADMIN_ID = process.env.ADMIN_ID;
  constructor(
    private readonly botService: BotService,
    private readonly prisma: PrismaService
  ) {}

  @On("callback_query")
  async handleAllCallbacks(
    @Ctx() ctx: Scenes.WizardContext,
    @Next() next: () => void
  ) {
    const data = (ctx.callbackQuery as any)?.data;
    const breakingActions = ["main-menu", "cancel", "ortga"];

    if (ctx.scene?.current && breakingActions.includes(data)) {
      await ctx.scene.leave();
      await ctx.reply("❌ Jarayon bekor qilindi.");
      return;
    }

    return next();
  }

  @Start()
  async onStart(@Ctx() ctx: MyContex) {
    if (ctx.from?.id === Number(this.ADMIN_ID)) {
      await ctx.reply(
        "Xush kelibsiz, Admin!\nStadionlarni boshqarish uchun quyidagi tugmalardan foydalaning.",
        {
          reply_markup: {
            keyboard: [
              [`➕ Stadion qo'shish`],
              [`🗑 Stadionni o'chirish`, `♻️ Stadionni yangilash`],
            ],
            resize_keyboard: true,
          },
        }
      );

      /////////////////////////////////////////////////////////////////////////////
    } else {
      const data = await this.prisma.stadion.findFirst({
        where: { menijer_chat_id: String(ctx.from!.id) },
      });
      if (!data) {
        ctx.reply(
          `Assalomu alaykum botga xush kelibsiz hurmatliy ${ctx.from?.first_name || "Foydalanuvchi"}`,
          Markup.keyboard([
            [`⌚ Stadion band qilish`, `📑 Band qilgan stadionlarim`],
          ]).resize()
        );
        return;
      }
      ctx.reply(
        `Asslaomu alaykum botga xush kelibsiz hurmatli ${ctx.from?.first_name || "Menijer"}`,
        Markup.keyboard([
          [`Zakazlarni ko'rish`, `Stadion malumotlari`],
          [`Ish vaqtlarini yaratish`],
        ]).resize()
      );
    }
  }

  @Command("/start")
  onStarts(@Ctx() ctx: MyContex) {
    return this.onStart(ctx);
  }

  @Hears("♻️ Stadionni yangilash")
  async updateStadium(@Ctx() ctx: MyContext) {
    // 🔁 Barcha state'larni tozalab chiqamiz
    ctx.session.state = "waitingForUpdateId";
    ctx.session.waitingForDeleteId = false;
    ctx.session.waitingForUpdateId = false;
    ctx.session.waitingForNewPrice = false;
    ctx.session.updateTargetId = null;

    const stadiums = await this.prisma.stadion.findMany();
    if (!stadiums.length) {
      await ctx.reply("Hozircha hech qanday stadion mavjud emas.");
      return;
    }

    for (const stadium of stadiums) {
      await ctx.reply(
        `🆔 ID: ${stadium.id}\n🏟 Region: ${stadium.region}\n💰 Narx: ${stadium.price?.toLocaleString()} so'm`
      );
    }

    await ctx.reply(
      `✏️ Yangilamoqchi bo'lgan stadionning ID raqamini yuboring.`
    );
    // 🔑 Bu yerda state orqali ishlash yaxshiroq
    ctx.session.state = "waitingForUpdateId";
  }

  ////////////////////////////////////////////////////////////////////////////////////

  @Hears("⌚ Stadion band qilish")
  async onBooking(@Ctx() ctx: MyContex) {
    ctx.session = ctx.session ?? {};
    ctx.session.user = ctx.session.user ?? {
      name: null,
      phone: null,
      userPhone: null,
      bookingSelectedRegion: null,
    };

    const regions = await this.prisma.stadion.findMany({
      distinct: ["region", "id"],
      select: { region: true },
    });

    if (!regions.length) {
      await ctx.reply("🤷‍♂️ Hozirda hech qanday hudud mavjud emas.");
      return;
    }

    const buttons = regions.map((r) => [
      Markup.button.callback(
        r.region,
        `region_${encodeURIComponent(r.region)}`
      ),
    ]);

    await ctx.reply(
      "📍 Qaysi hududdagi stadionni band qilmoqchisiz?",
      Markup.inlineKeyboard(buttons)
    );
    return;
  }

  @Action(/^region_(.+)/)
  async onRegionSelected(@Ctx() ctx: MyContex) {
    await ctx.answerCbQuery();

    const region = decodeURIComponent(ctx.match?.[1] ?? "");

    ctx.session.user = ctx.session.user ?? {};
    ctx.session.user.bookingSelectedRegion = region;

    const stadiums = await this.prisma.stadion.findMany({
      where: {
        region,
        status: true,
      },
      select: {
        id: true,
        phone: true,
        longitude: true,
        latitude: true,
        region: true,
        description: true,
        price: true,
        image: true,
      },
    });

    if (!stadiums.length) {
      return ctx.reply(
        `❌ ${region} hududida hozircha stadionlar mavjud emas.`
      );
    }

    for (const stadium of stadiums) {
      if (!stadium.longitude || !stadium.longitude) {
        continue;
      }

      await ctx.reply("⬇️⬇️⬇️⬇️⬇️⬇️⬇️⬇️");

      await ctx.replyWithLocation(stadium.longitude, stadium.latitude);
      await new Promise((res) => setTimeout(res, 300));

      const caption = `

🏟 <b>Region:</b> ${stadium.region}

📞 <b>Telefon:</b> ${stadium.phone}

💬 <b>Tavsif:</b> ${stadium.description}

💰 <b>Narx:</b> ${stadium.price?.toLocaleString()} so'm

🆔 <b>ID:</b> ${stadium.id}
    `.trim();

      if (stadium.image) {
        try {
          if (stadium.image.startsWith("http")) {
            await ctx.replyWithPhoto(
              { url: stadium.image },
              {
                caption,
                parse_mode: "HTML",
              }
            );
          } else {
            await ctx.replyWithPhoto(stadium.image, {
              caption,
              parse_mode: "HTML",
            });
          }
        } catch (err) {
          await ctx.reply(caption, { parse_mode: "HTML" });
        }
      } else {
        await ctx.reply(caption, { parse_mode: "HTML" });
      }
    }
    await ctx.reply(
      `✅ Band qilmoqchi bo‘lgan stadion ID sini yuboring:`,
      Markup.keyboard([["Ortga"]]).resize()
    );
    ctx.session.region = "region";
    ctx.session.booking_id = "booking";
  }

  ////////////////////////////////////////////////////////////////////////////////////////////////

  @Hears("📑 Band qilgan stadionlarim")
  async myBookings(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.scene.leave();

    const telegramId = ctx.from?.id;
    if (!telegramId) return ctx.reply("❌ Telegram ID aniqlanmadi.");

    const user = await this.prisma.user.findFirst({
      where: { telegramId },
    });

    if (!user) {
      await ctx.reply("Siz hali biror stadion band qilmagansiz.");
      return;
    }

    const bookings = await this.prisma.booking.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        book_date: "desc",
      },
    });

    if (bookings.length === 0) {
      await ctx.reply("Siz hali biror stadion band qilmagansiz.");
      return;
    }

    for (const booking of bookings) {
      const stadion = await this.prisma.stadion.findFirst({
        where: { id: booking.stadionId },
      });

      const text = `
📍 Stadion: ${stadion?.name ?? "Nomaʼlum"}
📅 Sana: ${booking.dey}
🕓 Vaqt: ${booking.time}
📌 Hudud: ${stadion?.region ?? "Nomaʼlum"}
📍 Manzil: ${stadion?.longitude ?? "Nomaʼlum"}
💰 Narxi: ${stadion?.price ?? "Nomaʼlum"} so'm
    `.trim();

      await ctx.reply(text);
    }
  }

  @Hears(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
  async onTimeRange(@Ctx() ctx: MyContext) {
    if (ctx.message && "text" in ctx.message) {
      const timeRange = ctx.message.text;
      await ctx.reply(`✅ Qabul qilindi: ${timeRange}`, {
        reply_markup: {
          keyboard: [[{ text: "⬅️ Ortga" }]],
          resize_keyboard: true,
        },
      });
    } else {
      await ctx.reply(
        "❌ Iltimos, vaqt oralig‘ini matn ko‘rinishida kiriting."
      );
    }
  }

  @Action("confirm_booking")
  async handleConfirm(@Ctx() ctx: Scenes.WizardContext) {
    await ctx.reply(
      "Iltimos, vaqt oralig'ini kiriting (masalan: 16:00-18:00)",
      {
        reply_markup: {
          keyboard: [[{ text: "⬅️ Ortga" }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      }
    );

    ctx.wizard.selectStep(1); // 👉 keyingi stepga o'tamiz
  }

  ///////////////////////////////////////////////////////////////////////////

  @Hears(`🗑 Stadionni o'chirish`)
  async deleteStadium(@Ctx() ctx: MyContex) {
    ctx.session.state = "waitingForDeleteId"; // 👈 BU MUHIM!
    ctx.session.page = 0; // boshlang‘ich sahifa
    await this.botService.showPage(ctx);
    await ctx.reply("⛔ O'chirmoqchi bo'lgan stadion ID raqamini kiriting:");
  }

  @Hears("Zakazlarni ko'rish")
  async onZakaz(@Ctx() ctx: MyContex) {
    const chatId = String(ctx.from?.id);
    const stadionlar = await this.prisma.stadion.findMany({
      where: { menijer_chat_id: chatId },
      include: { Booking: { include: { user: true } } },
    });

    if (!stadionlar.length)
      return ctx.reply("Sizga biriktirilgan stadionlar topilmadi.");

    let bookingFound = false;
    for (const stadion of stadionlar) {
      if (!stadion.Booking.length) continue;

      bookingFound = true;
      await ctx.reply(`📍 <b>${stadion.region}</b> hududidagi zakazlar:`, {
        parse_mode: "HTML",
      });

      for (const booking of stadion.Booking) {
        const msg = `
🗓 <b>Sana:</b> ${booking.dey}
⏰ <b>Soat:</b> ${booking.time}
👤 <b>Ism:</b> ${booking.user.name}
📞 <b>Telefon:</b> ${booking.user.phone}`;
        await ctx.reply(msg, { parse_mode: "HTML" });
      }
    }
    if (!bookingFound) ctx.reply("Sizga tegishli stadionlarda zakazlar yo‘q.");
  }

  @Hears("Stadion malumotlari")
  onStadionMalumot(@Ctx() ctx: MyContex) {
    return this.botService.findStadionMalumotlari(ctx);
  }

  @Action(/^edit_Ubdate_(\d+)$/)
  async onEditStadion(@Ctx() ctx: MyContex) {
    const stadionId = ctx.match?.[1];
    if (!stadionId) return ctx.reply("ID aniqlanmadi.");

    const stadion = await this.prisma.stadion.findUnique({
      where: { id: Number(stadionId) },
    });
    if (!stadion) return ctx.reply("Stadion topilmadi.");

    ctx.session.update = {
      id: stadion.id,
      region: stadion.region,
      phone: stadion.phone,
      description: stadion.description,
      longitude: stadion.longitude,
      latitude: stadion.latitude,
      price: stadion.price,
      image: stadion.image,
      step: "region",
    };

    await ctx.reply(
      "✏️ Yangi region nomini kiriting:",
      Markup.keyboard([["Ortga"]]).resize()
    );
  }

  @Hears("Ish vaqtlarini yaratish")
  async stadionIshvaqtlari(@Ctx() ctx: MyContex) {
    const menegerId = String(ctx.from?.id);
    const stadion = await this.prisma.stadion.findFirst({
      where: { menijer_chat_id: menegerId },
      include: { Stadion_schedule: true },
    });

    if (!stadion) {
      return ctx.reply("❗ Sizga biriktirilgan stadion topilmadi.");
    }

    // Sessionga stadion ID ni saqlash
    ctx.session.stadionSchedule = {
      stadionId: stadion.id,
    };

    // Ish vaqtlari bor bo‘lsa — ularni ko‘rsatish
    if (stadion.Stadion_schedule.length) {
      let text = `📍 <b>${stadion.region}</b> hududidagi ish vaqtlari:\n\n`;
      stadion.Stadion_schedule.forEach((schedule, index) => {
        text += `#${index + 1}) 🕒 <b>${schedule.start_time}</b> - <b>${schedule.end_time}</b>\n`;
      });

      await ctx.reply(text, { parse_mode: "HTML" });
    } else {
      await ctx.reply("⚠️ Stadion uchun ish vaqtlari belgilanmagan.");
    }
    await ctx.reply(
      "⬇️ Davom ettirish uchun amal tanlang:",
      Markup.keyboard([["🆕 Yaratish", "✏️ Tahrirlash"], ["Ortga"]]).resize()
    );
    ctx.session.location = "ABS";
  }

  @Hears("🆕 Yaratish")
  async onCreateSchedule(@Ctx() ctx: MyContex) {
    ctx.session.state = "start_time";
    await ctx.reply(
      "⏰ Ochilish vaqtini kiriting (masalan: 08:00):",
      Markup.keyboard([["Ortga"]]).resize()
    );
  }

  @Hears("➕ Stadion qo'shish")
  async addStadium(@Ctx() ctx: MyScenes) {
    ctx.scene.enter("add-stadium-wizard");
  }

  @Hears("Ortga")
  async OnOrtga(@Ctx() ctx: MyContex) {
    if (ctx.session.update) {
      ctx.session.update = null;
      return ctx.reply(
        "Tahrirlash bekor qilindi. Siz asosiy menyuga o'tdingiz.",
        Markup.keyboard([
          ["Zakazlarni ko'rish", "Stadion malumotlari"],
          ["Ish vaqtlarini yaratish"],
        ]).resize()
      );
    }
    if (ctx.from?.id == Number(this.ADMIN_ID)) {
      ctx.reply(
        "Siz asosiy menyuga o'ttingiz",
        Markup.keyboard([
          [`➕ Stadion qo'shish`],
          [`🗑 Stadionni o'chirish`, `♻️ Stadionni yangilash`],
        ]).resize()
      );
      return;
    }
    if (ctx.session.region == "region") {
      ctx.reply(
        "Siz asosiy menyuga o'ttingiz",
        Markup.keyboard([
          [`Stadion band qilish`, `Band qilgan stadionlaringiz`],
        ]).resize()
      );
      ctx.session.region = null;
    }
    if (ctx.session.location == "ABS") {
      await ctx.reply(
        `Asosiy menyu`,
        Markup.keyboard([
          ["Zakazlarni ko'rish", "Stadion malumotlari"],
          ["Ish vaqtlarini yaratish"],
        ]).resize()
      );
    }
    await ctx.reply("🏠 Bosh sahifaga xush kelibsiz!", {
      reply_markup: {
        keyboard: [["📅 Stadion band qilish", "📑 Band qilgan stadionlarim"]],
        resize_keyboard: true,
      },
    });
  }

  @Hears("Stadionlarni ko'rish")
  OnStadionlar(@Ctx() ctx: MyContex) {
    return this.botService.showPage(ctx);
  }

  @Action("next")
  async nextPage(@Ctx() ctx: MyContex) {
    await ctx.answerCbQuery();
    ctx.session.page = (ctx.session.page ?? 0) + 1;
    await this.botService.showPage(ctx);
  }

  @Action("prev")
  async prevPage(@Ctx() ctx: MyContex) {
    await ctx.answerCbQuery();
    ctx.session.page = Math.max((ctx.session.page ?? 0) - 1, 0);
    await this.botService.showPage(ctx);
  }

  @Command("help")
  async onHelp(@Ctx() ctx: MyContex) {
    const firstName = ctx.from?.first_name
      ? `@${ctx.from.first_name}`
      : ctx.from?.first_name || "Foydalanuvchi";
    await ctx.reply(`
      📋 Yordam bo‘limi

Assalomu alaykum!, ${firstName} 
Ushbu bot orqali siz futbol stadionlarini onlayn bron qilishingiz, mavjud vaqtlarni ko‘rishingiz va eng qulay vaqtni tanlashingiz mumkin.

⚽️ Bot imkoniyatlari:

🏟 Stadionlar ro'yxati — barcha mavjud stadionlarni joylashuvi, narxi va suratlari bilan ko‘rishingiz mumkin.

📅 Bo‘sh vaqtlar jadvali — har bir stadion uchun mavjud sana va soatlarni tekshirishingiz mumkin.

📌 Bron qilish — tanlagan sana, vaqt va stadion bo‘yicha bron qilishingiz mumkin.

🧾 Mening bronlarim — o‘zingiz qilgan bronlar ro‘yxatini ko‘rishingiz mumkin.

❓ Yordam — ushbu bo‘lim orqali botdan qanday foydalanishni o‘rganishingiz mumkin.

Agar sizda savollar bo‘lsa, admin bilan bog‘laning: @BahodirNabijanov
    `);
  }

  @Command("info")
  async onInfo(@Ctx() ctx: MyContex) {
    const firstName = ctx.from?.first_name
      ? `@${ctx.from.first_name}`
      : ctx.from?.first_name || "Foydalanuvchi";

    await ctx.reply(
      `
ℹ️ *Bot haqida*

Salom, ${firstName}!

Bu bot orqali siz:

• 🏟 Stadionlarni ko‘rishingiz 

• 📅 Bo‘sh vaqtlarni tekshirishingiz  

• 📌 Stadion band qilishingiz mumkin

Bot ishlash tartibi oddiy va qulay. Siz uchun eng mos vaqtni tanlang va bron qiling!

Yordam kerakmi? /help ni bosing  
Admin: @BahodirNabijanov
`,
      {
        parse_mode: "Markdown",
      }
    );
  }

  @Action("book")
  async onYes(@Ctx() ctx: MyContex) {
    await ctx.answerCbQuery();
    ctx.session = ctx.session ?? {};
    ctx.session.stadionSchedule = ctx.session.stadionSchedule ?? {};

    const userId = ctx.from?.id;
    if (!userId) return;

    const manager = await this.prisma.user.findFirst({
      where: { telegramId: BigInt(userId) }, // Eslatma: BigInt kerak
      include: { stadion: true },
    });

    let stadionId: number | undefined;

    if (!manager || !manager.stadion) {
      await ctx.reply(
        "❗ Sizga stadion biriktirilmagan bo‘lsa ham, vaqt kiritishingiz mumkin."
      );
    } else {
      stadionId = manager.stadion.id;
    }

    await ctx.reply(
      "🕒 Iltimos, ish vaqt oralig‘ini quyidagi formatda kiriting:\n\n`08:00-10:00`",
      {
        parse_mode: "Markdown",
      }
    );

    ctx.session.step = "ENTER_TIME_RANGE";
    ctx.session.stadionSchedule = {
      stadionId: stadionId ?? 0,
      step: "ENTER_TIME_RANGE",
    };
  }

  @Action("cancel_booking")
  async onNo(@Ctx() ctx: MyContex) {
    await ctx.answerCbQuery();
    await ctx.reply("❌ Buyurtma bekor qilindi.");
    return;
  }

  ///////////////////////////////////////////////
  @On("text")
  async onStepHandler(@Ctx() ctx: MyContex) {
    ctx.session = ctx.session ?? {};
    ctx.session.stadion = ctx.session.stadion ?? {};

    if (!ctx.session) return;

    if (
      ctx.session.step === "ENTER_TIME_RANGE" &&
      ctx.message &&
      "text" in ctx.message
    ) {
      const timeRange = ctx.message.text;
      if (!/^\d{2}:\d{2}-\d{2}:\d{2}$/.test(timeRange)) {
        await ctx.reply(
          "❗ Noto‘g‘ri format. Iltimos, `08:00-10:00` ko‘rinishida kiriting."
        );
        return;
      }

      ctx.session.stadionSchedule.timeRange = timeRange;

      await ctx.reply(`✅ Qabul qilindi: ${timeRange}`);
    }

    if (
      ctx.message &&
      "text" in ctx.message &&
      ctx.session.booking_id == "booking"
    ) {
      const id = Number(ctx.message.text);
      if (isNaN(id)) return;
      const stadion = await this.prisma.stadion.findFirst({
        where: {
          id: id,
        },
      });

      if (!stadion) {
        await ctx.reply("❌ Bunday IDga ega stadion topilmadi.");
        return;
      }

      await ctx.replyWithLocation(stadion.longitude, stadion.latitude);

      const caption = `
🏟 <b>Region:</b> ${stadion.region}
📞 <b>Telefon:</b> ${stadion.phone}
💬 <b>Tavsif:</b> ${stadion.description}
💰 <b>Narx:</b> ${stadion.price.toLocaleString()} so'm
🆔 <b>ID:</b> ${stadion.id}
  `.trim();

      await ctx.replyWithPhoto(stadion.image, {
        caption,
        parse_mode: "HTML",
      });

      await ctx.reply(
        "🗓 Stadionni band qilishni istaysizmi?",
        Markup.inlineKeyboard([
          Markup.button.callback("✅ Ha", `book`),
          Markup.button.callback(`❌ Yo'q`, "cancel_booking"),
        ])
      );

      ctx.session.booking_id = null;

      return;
    }

    if (ctx.message && "text" in ctx.message) {
      const text = ctx.message.text;

      // START TIME
      if (ctx.session.state === "start_time") {
        ctx.session.createStartTime = text;
        ctx.session.state = "end_time";

        await ctx.reply(
          "⏰ Yopilish vaqtini kiriting (masalan: 22:00):",
          Markup.keyboard([["Ortga"]]).resize()
        );
        return;
      }

      // END TIME
      if (ctx.session.state === "end_time") {
        ctx.session.createEndTime = text;
        ctx.session.state = "";

        const start = ctx.session.createStartTime;
        const end = ctx.session.createEndTime;
        const stadionId = ctx.session.stadionSchedule?.stadionId;

        if (!start || !end || !stadionId) {
          ctx.reply("❗ Maʼlumotlar toʻliq emas.");
          return;
        }

        const startHour = parseInt(start.split(":")[0]);
        const endHour = parseInt(end.split(":")[0]);

        if (isNaN(startHour) || isNaN(endHour) || startHour >= endHour) {
          ctx.reply("❗ Noto‘g‘ri vaqt oralig‘i. Qayta urinib ko‘ring.");
          return;
        }

        const bookedTimes = await this.prisma.booking.findMany({
          where: {
            stadionId: stadionId,
            dey: new Date().toISOString().split("T")[0],
          },
          select: { time: true },
        });

        const reserved = bookedTimes.map((b) => b.time);

        let count = 0;
        for (let hour = startHour; hour < endHour; hour++) {
          const slot = `${hour.toString().padStart(2, "0")}:00`;
          if (reserved.includes(slot)) continue;

          await this.prisma.stadion_schedule.create({
            data: {
              stadion_id: stadionId,
              start_time: slot,
              end_time: `${(hour + 1).toString().padStart(2, "0")}:00`,
            },
          });
          count++;
        }

        ctx.session.createStartTime = "";
        ctx.session.createEndTime = "";

        await ctx.reply(
          `✅ ${count} ta ish vaqt saqlandi!`,
          Markup.keyboard([
            ["Zakazlarni ko'rish", "Stadion malumotlari"],
            ["Ish vaqtlarini yaratish"],
          ]).resize()
        );
        return;
      }
    }
    if (
      ctx.session.update?.step === "region" &&
      ctx.message &&
      "text" in ctx.message
    ) {
      ctx.session.update.region = ctx.message.text;
      ctx.session.update.step = "phone";
      ctx.reply(
        "📞 Yangi telefon raqamini kiriting:",
        Markup.keyboard([["Ortga"]]).resize()
      );
      return;
    }

    if (
      ctx.session.update?.step === "phone" &&
      ctx.message &&
      "text" in ctx.message
    ) {
      ctx.session.update.phone = ctx.message.text;
      ctx.session.update.step = "description";
      ctx.reply(
        "📝 Yangi tavsifni kiriting:",
        Markup.keyboard([["Ortga"]]).resize()
      );
      return;
    }

    if (
      ctx.session.update?.step === "description" &&
      ctx.message &&
      "text" in ctx.message
    ) {
      ctx.session.update.description = ctx.message.text;
      ctx.session.update.step = "price";
      ctx.reply(
        "💰 Yangi narxni kiriting:",
        Markup.keyboard([["Ortga"]]).resize()
      );
      return;
    }

    if (
      ctx.session.update?.step === "price" &&
      ctx.message &&
      "text" in ctx.message
    ) {
      const price = parseInt(ctx.message.text);
      if (isNaN(price)) return ctx.reply("❗ Narx raqamda bo‘lishi kerak.");
      ctx.session.update.price = price;
      ctx.session.update.step = "image";
      ctx.reply(
        "🖼 Yangi rasmni yuboring:",
        Markup.keyboard([["Ortga"]]).resize()
      );
      return;
    }

    if (
      ctx.session.update?.step === "image" &&
      ctx.message &&
      "photo" in ctx.message
    ) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      ctx.session.update.image = photo.file_id;

      const {
        id,
        region,
        phone,
        description,
        latitude,
        longitude,
        price,
        image,
      } = ctx.session.update;
      await this.prisma.stadion.update({
        where: { id },
        data: {
          region,
          phone,
          description,
          latitude,
          longitude,
          price,
          image: image,
        },
      });

      ctx.session.update = null;
      ctx.reply(
        "✅ Stadion ma'lumotlari muvaffaqiyatli yangilandi!",
        Markup.keyboard([[`Stadion malumotlari`]]).resize()
      );
      return;
    }

    if (
      ctx.session.region === "region" &&
      ctx.message &&
      "text" in ctx.message
    ) {
      ctx.session.stadion.region = ctx.message.text;
      ctx.session.region = null;
      ctx.session.phone = "phone";
      ctx.reply(
        "📞 Telefon raqamini (998930451852) shaklida kiriting:",
        Markup.keyboard([["Ortga"]]).resize()
      );
      return;
    }

    if (ctx.session.phone === "phone" && ctx.message && "text" in ctx.message) {
      ctx.session.stadion.phone = ctx.message.text;
      ctx.session.phone = null;
      ctx.session.description = "description";
      ctx.reply("📝 Tavsif kiriting:", Markup.keyboard([["Ortga"]]).resize());
      return;
    }

    if (
      ctx.session.description === "description" &&
      ctx.message &&
      "text" in ctx.message
    ) {
      ctx.session.stadion.description = ctx.message.text;
      ctx.session.description = null;
      ctx.session.location = "location";
      ctx.reply(
        "📍 Joylashuvingizni yuboring:",
        Markup.keyboard([["Ortga"]]).resize()
      );
      return;
    }

    if (
      ctx.session.location === "location" &&
      ctx.message &&
      "location" in ctx.message
    ) {
      const { latitude, longitude } = ctx.message.location;
      ctx.session.stadion.location = `${latitude},${longitude}`;
      ctx.session.location = null;
      ctx.session.price = "price";
      ctx.reply(
        "💰 Narxni kiriting (raqamda):",
        Markup.keyboard([["Ortga"]]).resize()
      );
      return;
    }

    if (ctx.session.price === "price" && ctx.message && "text" in ctx.message) {
      const price = parseInt(ctx.message.text);
      if (isNaN(price)) ctx.reply("❗ Raqam bo'lishi kerak. Qayta kiriting:");

      ctx.session.stadion.price = price;
      ctx.session.price = null;
      ctx.session.image = "image";
      ctx.reply("🖼 Rasm yuboring:", Markup.keyboard([["Ortga"]]).resize());
      return;
    }

    if (
      ctx.session.image === "image" &&
      ctx.message &&
      "photo" in ctx.message
    ) {
      const photo = ctx.message.photo[ctx.message.photo.length - 1];
      ctx.session.stadion.image = photo.file_id;
      ctx.session.image = null;
      ctx.session.menigerid = "menigerid";
      ctx.reply(
        "Menijer chatId sini kriting:",
        Markup.keyboard([["Ortga"]]).resize()
      );
      return;
    }

    if (
      ctx.session.menigerid === "menigerid" &&
      ctx.message &&
      "text" in ctx.message
    ) {
      ctx.session.stadion.menigerid = ctx.message.text;
      ctx.session.menigerid = null;
      return this.botService.stadionCreted(ctx);
    }

    /////////////////////////////////////////////////

    //     if (
    //       ctx.session.user?.bookingSelectedRegion &&
    //       ctx.message &&
    //       'text' in ctx.message &&
    //       ctx.session.state === 'waiting_stadium_id'
    //     ) {
    //       const id = Number(ctx.message.text);
    //       if (isNaN(id)) return;

    //       const stadion = await this.prisma.stadion.findFirst({
    //         where: { id, region: ctx.session.user.bookingSelectedRegion },
    //       });

    //       if (!stadion) {
    //         await ctx.reply('❌ Bunday IDga ega stadion topilmadi.');
    //         return;
    //       }
    //       {
    //         await ctx.replyWithLocation(stadion.longitude, stadion.latitude);

    //         const caption = `

    // 🏟 <b>Region:</b> ${stadion.region}

    // 📞 <b>Telefon:</b> ${stadion.phone}

    // 💬 <b>Tavsif:</b> ${stadion.description}

    // 💰 <b>Narx:</b> ${stadion.price.toLocaleString()} so'm

    // 🆔 <b>ID:</b> ${stadion.id}
    // `.trim();

    //         await ctx.replyWithPhoto(stadion.image, {
    //           caption,
    //           parse_mode: 'HTML',
    //         });

    //         await ctx.reply(
    //           '🗓 Stadionni band qilishni istaysizmi?',
    //           Markup.inlineKeyboard([
    //             Markup.button.callback('✅ Ha', `book_${stadion.id}`),
    //             Markup.button.callback('❌ Yo‘q', 'cancel_booking'),
    //           ]),
    //         );
    //       }
    //       ctx.session.booking_id = null;
    //     }

    ctx.reply("Iltimos, kerakli formatda ma'lumot yuboring.");
  }

  @Hears(/^\d+$/)
  async handleDeleteId(@Ctx() ctx: any) {
    ctx.session.waitingForUpdateId = true;
    if (!ctx.session.waitingForDeleteId) return;
    const id = parseInt(ctx.message.text);
    const stadium = await this.prisma.stadion.findUnique({ where: { id } });

    if (!stadium) {
      await ctx.reply(`Bu ID bo'yicha stadion topilmadi.`);
      return;
    }

    await this.prisma.stadion.delete({ where: { id } });
    await ctx.reply(`✅ Stadion muvaffaqiyatli o'chirildi.`);
    ctx.session.waitingForDeleteId = false;
  }

  @Hears(/^\d+$/)
  async handleUpdateId(@Ctx() ctx: any) {
    try {
      if (!ctx.session.waitingForUpdateId) return;
      const id = parseInt(ctx.message.text);
      const stadium = await this.prisma.stadion.findUnique({ where: { id } });

      if (!stadium) {
        await ctx.reply(`Bu ID bo'yicha stadion topilmadi.`);
        return;
      }

      ctx.session.updateTargetId = id;
      ctx.session.waitingForUpdateId = false;
      ctx.session.waitingForNewPrice = true;
      await ctx.reply("Iltimos, yangi narxni kiriting:");
    } catch (error) {
      ctx.reply("❌ Xatolik yuz berdi, iltimos keyinroq urinib ko'ring");
    }
  }

  @Hears(/^\d+$/)
  async handleNewPrice(@Ctx() ctx: any) {
    try {
      if (!ctx.session.waitingForNewPrice || !ctx.session.updateTargetId)
        return;
      const newPrice = parseInt(ctx.message.text);
      await this.prisma.stadion.update({
        where: { id: ctx.session.updateTargetId },
        data: { price: newPrice },
      });
      await ctx.reply("✅ Stadion narxi yangilandi.");
      ctx.session.waitingForNewPrice = false;
      ctx.session.updateTargetId = null;
    } catch (error) {
      ctx.reply("❌ Xatolik yuz berdi, iltimos keyinroq urinib ko'ring");
    }
  }

  @Hears(/^\d+$/)
  async handleHears(@Ctx() ctx: any) {
    const text = ctx.message.text;
    const number = parseInt(text);

    switch (ctx.session.state) {
      case "waitingForDeleteId":
        const stadiumToDelete = await this.prisma.stadion.findUnique({
          where: { id: number },
        });
        if (!stadiumToDelete) return ctx.reply("❌ Stadion topilmadi.");
        await this.prisma.stadion.delete({ where: { id: number } });
        await ctx.reply("✅ O'chirildi.");
        ctx.session.state = null;
        break;

      case "waitingForUpdateId":
        const stadiumToUpdate = await this.prisma.stadion.findUnique({
          where: { id: number },
        });
        if (!stadiumToUpdate) return ctx.reply("❌ Stadion topilmadi.");
        ctx.session.updateTargetId = number;
        ctx.session.state = "waitingForNewPrice";
        await ctx.reply("Yangi narxni kiriting:");
        break;

      case "waitingForNewPrice":
        if (!ctx.session.updateTargetId) return;
        await this.prisma.stadion.update({
          where: { id: ctx.session.updateTargetId },
          data: { price: number },
        });
        await ctx.reply("✅ Narx yangilandi.");
        ctx.session.state = null;
        ctx.session.updateTargetId = null;
        break;
    }
  }
}

@Wizard("add-stadium-wizard")
export class AddStadiumWizard {
  constructor(
    private prisma: PrismaService,
    private botService: BotService
  ) {}
  @WizardStep(0)
  async step0(@Ctx() ctx: MyScenes) {
    const state = ctx.wizard.state as StadiumDataState;
    state.stadiumData = {};

    await ctx.reply("Stadion nomini matn ko'rinishida yuboring:");
    ctx.wizard.next();
    return;
  }

  @WizardStep(1)
  async step1(@Ctx() ctx: MyScenes) {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Iltimos, stadion nomini matn ko'rinishida yuboring.");
      return;
    }

    const state = ctx.wizard.state as StadiumDataState;
    state.stadiumData.name = ctx.message.text;

    await ctx.reply("Iltimos, stadion tavsifini yuboring:");
    ctx.wizard.next();
    return;
  }

  @WizardStep(2)
  async step2(@Ctx() ctx: MyScenes) {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Iltimos, stadion tavsifini matn ko'rinishida yuboring.");
      return;
    }

    const state = ctx.wizard.state as StadiumDataState;
    state.stadiumData.description = ctx.message.text;

    await ctx.reply("Iltimos, stadion joylashuvini yuboring:", {});
    ctx.wizard.next();
    return;
  }

  @WizardStep(3)
  async step3(@Ctx() ctx: MyScenes) {
    if (!ctx.message || !("location" in ctx.message)) {
      await ctx.reply(
        "Iltimos, stadion joylashuvini '📍 Location' ko'rinishida yuboring."
      );
      return;
    }

    const loc = ctx.message["location"];
    const state = ctx.wizard.state as StadiumDataState;
    state.stadiumData.latitude = loc.latitude;
    state.stadiumData.longitude = loc.longitude;

    await ctx.reply(`Stadion narxini kiriting (so'mda):`);
    ctx.wizard.next();
    return;
  }

  @WizardStep(4)
  async step4(@Ctx() ctx: MyScenes) {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Iltimos, narxni raqam ko'rinishida kiriting:");
      return;
    }

    const state = ctx.wizard.state as StadiumDataState;
    const price = parseInt(ctx.message["text"], 10);
    if (isNaN(price)) {
      await ctx.reply("Narxni faqat raqam ko'rinishida kriting:");
      return;
    }
    state.stadiumData.price = price;

    await ctx.reply("Telefon raqamini kiriting:");
    ctx.wizard.next();
    return;
  }

  @WizardStep(5)
  async step5(@Ctx() ctx: MyScenes) {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Iltimos, telefon raqamini kiriting:");
      return;
    }

    const state = ctx.wizard.state as StadiumDataState;
    state.stadiumData.phone = ctx.message["text"];

    await ctx.reply("Hudud nomini kiriting:");
    ctx.wizard.next();
    return;
  }

  @WizardStep(6)
  async step6(@Ctx() ctx: MyScenes) {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply("Iltimos, hudud nomini kiriting:");
      return;
    }

    const state = ctx.wizard.state as StadiumDataState;
    state.stadiumData.region = ctx.message["text"];

    await ctx.reply("Menedjerning Telegram chat ID raqamini kiriting:");
    ctx.wizard.next();
    return;
  }

  @WizardStep(7)
  async step7(@Ctx() ctx: MyScenes) {
    if (!ctx.message || !("text" in ctx.message)) {
      await ctx.reply(
        "Iltimos, menedjer chat ID sini raqam ko'rinishida kiriting:"
      );
      return;
    }

    const state = ctx.wizard.state as StadiumDataState;
    const chatId = parseInt(ctx.message["text"], 10);
    if (isNaN(chatId)) {
      await ctx.reply("Faqat raqam kiriting:");
      return;
    }

    state.stadiumData.menijer_chat_id = chatId;

    await ctx.reply(`Stadion rasmini rasm ko'rinishida yuboring.`);
    ctx.wizard.next();
    return;
  }

  @WizardStep(8)
  async step8(@Ctx() ctx: MyScenes) {
    if (!ctx.message || !("photo" in ctx.message)) {
      await ctx.reply("Iltimos, stadion rasmini rasm ko'rinishida yuboring.");
      return;
    }
    const state = ctx.wizard.state as StadiumDataState;
    const photo = ctx.message["photo"];
    const largestPhoto = photo[photo.length - 1];
    state.stadiumData.image = largestPhoto.file_id;

    await ctx.reply(
      "✅ Stadion ma'lumotlari to'liq yig'ildi. Bazaga saqlanmoqda..."
    );
    ctx.scene.leave();
    return this.botService.Creted(ctx);
  }
}

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
