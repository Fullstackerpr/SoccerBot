import { Context } from 'telegraf';

export interface IssesionData {
  user: {
    name: string | null;
    phone: string | null;
    telegramId: number;
    bookingSelectedRegion?: string;
    userPhone?: string | 'waiting_phone';
  };

  booking: {
    stadion_id: number | null;
    phone: string | null;
  };

  booking_id?: string | null;

  user_name: string | null;
  user_phone: string | null;
  user_telegramId: number | null;

  ////////////////////////////////////////////
  state: string;
  step?: string;
  stadionId?: number;
  createEndTime: string;
  createStartTime: string;
  stadionSchedule: {
    stadionId: number;
    timeRange?: string;
    step?: string;
    availableTimes?: string[];
  };
  phone: string | null;
  location: string | null;
  region: string | null;
  description: string | null;
  price: string | null;
  image: string | null;
  menigerid: string | null;

  stadion: {
    phone: string | null;
    location: string | null;
    region: string | null;
    description: string | null;
    price: number | null;
    image: string | null;
    menigerid: string | null;
  };

  update?: {
    id: number;
    region: string;
    phone: string;
    description: string;
    latitude: number;
    longitude: number;
    price: number;
    image: string;
    step: 'region' | 'phone' | 'description' | 'price' | 'image';
  } | null;

  page?: number;
}

export interface MyContex extends Context {
  scene: any;
  wizard: any;
  session: IssesionData;
  match?: RegExpMatchArray;
  region: string | any;
  tahrirlsh: string | null;
}

export interface MyContext extends Context {
  session: {
    state: string;
    waitingForDeleteId?: boolean;
    waitingForUpdateId?: boolean;
    updateTargetId?: number | null;
    waitingForNewPrice?: boolean;
    pagr?: number;
  };

  ABS: string | null;
}

export interface StadiumDataState {
  stadiumData: {
    name?: string;
    description?: string;
    price?: number;
    phone?: string;
    region?: string;
    menijer_chat_id?: number;
    image?: string;
    latitude?: number;
    longitude?: number;
  };
}
