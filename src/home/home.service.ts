import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { HomeResponseDto } from './dto/home.dto';
import { PropertyType } from '@prisma/client';

interface QueryParams {
  city?: string;
  price?: {
    gte?: number;
    lte?: number;
  };
  land_size?: {
    gte?: number;
    lte?: number;
  };
  property_type?: PropertyType;
}

interface CreateHomeParams {
  address: string;
  numberOfBathrooms: number;
  numberOfBedrooms: number;
  city: string;
  price: number;
  landSize: number;
  propertyType: PropertyType;
  images: { url: string }[];
}

interface UpdateHomeParams extends Partial<Omit<CreateHomeParams, 'images'>> {}

@Injectable()
export class HomeService {
  constructor(private readonly prismaService: PrismaService) {}

  async getHomes(query: QueryParams): Promise<HomeResponseDto[]> {
    const homes = await this.prismaService.home.findMany({
      select: {
        id: true,
        address: true,
        number_of_bathrooms: true,
        number_of_bedrooms: true,
        city: true,
        price: true,
        land_size: true,
        property_type: true,
        images: {
          select: {
            url: true,
          },
          take: 1,
        },
      },
      where: query,
    });
    return homes.map((home) => {
      const { images, ...rest } = home;
      return new HomeResponseDto({ ...rest, image: images[0].url });
    });
  }

  async getHomeById(id: number): Promise<HomeResponseDto> {
    const home = await this.prismaService.home.findUnique({
      where: { id },
      select: {
        id: true,
        address: true,
        number_of_bathrooms: true,
        number_of_bedrooms: true,
        city: true,
        price: true,
        land_size: true,
        property_type: true,
        images: {
          select: {
            url: true,
          },
        },
        realtor: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
      },
    });

    if (!home) {
      throw new NotFoundException(`Home with id ${id} not found`);
    }

    return new HomeResponseDto(home);
  }

  async createHome(homeInfo: CreateHomeParams, userId: number) {
    const home = await this.prismaService.home.create({
      data: {
        address: homeInfo.address,
        number_of_bathrooms: homeInfo.numberOfBathrooms,
        number_of_bedrooms: homeInfo.numberOfBedrooms,
        city: homeInfo.city,
        price: homeInfo.price,
        land_size: homeInfo.landSize,
        property_type: homeInfo.propertyType,
        realtor_id: userId,
        images: {
          create: homeInfo.images,
        },
      },
    });
    return new HomeResponseDto(home);
  }

  async updateHome(id: number, data: UpdateHomeParams) {
    const updatedHome = await this.prismaService.home.update({
      where: { id },
      data,
    });

    return new HomeResponseDto(updatedHome);
  }

  async deleteHome(id: number) {
    await this.prismaService.image.deleteMany({
      where: { home_id: id },
    });

    await this.prismaService.home.delete({
      where: { id },
    });
  }

  async getRealtorByHomeId(id: number) {
    const home = await this.prismaService.home.findUnique({
      where: { id },
      select: {
        realtor: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!home) {
      throw new NotFoundException(`Home with id ${id} not found`);
    }

    return home.realtor;
  }

  async inquire(buyerId: number, homeId: number, message: string) {
    const realtor = await this.getRealtorByHomeId(homeId);

    return await this.prismaService.message.create({
      data: {
        message,
        home_id: homeId,
        realtor_id: realtor.id,
        buyer_id: buyerId,
      },
    });
  }
}
