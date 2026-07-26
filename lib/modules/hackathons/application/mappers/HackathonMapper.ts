import { HackathonAggregate } from '../../domain/aggregates/HackathonAggregate';
import { HackathonDTO } from '../dtos/HackathonDTO';

export class HackathonMapper {
  public static toDTO(aggregate: HackathonAggregate): HackathonDTO {
    return {
      id: aggregate.id.toString(),
      title: aggregate.title,
      slug: aggregate.slug,
      description: aggregate.description,
      startDate: aggregate.startDate,
      endDate: aggregate.endDate,
      registrationDeadline: aggregate.registrationDeadline,
      locationCity: aggregate.locationCity,
      locationCollege: aggregate.locationCollege,
      isOnline: aggregate.isOnline,
      latitude: aggregate.latitude,
      longitude: aggregate.longitude,
      tags: aggregate.tags,
      prizePool: aggregate.prizePool,
      prizeAmount: aggregate.prizeAmount,
      organizer: aggregate.organizer,
      coverImage: aggregate.coverImage,
      logoUrl: aggregate.logoUrl,
      status: aggregate.status,
      viewsCount: aggregate.viewsCount,
      avgRating: aggregate.avgRating,
      reviewsCount: aggregate.reviewsCount,
      submittedBy: aggregate.submittedBy,
      createdAt: aggregate.createdAt,
      updatedAt: aggregate.updatedAt,
    };
  }

  public static toDomain(dto: HackathonDTO): HackathonAggregate {
    return HackathonAggregate.create(
      {
        title: dto.title,
        slug: dto.slug,
        description: dto.description,
        startDate: dto.startDate,
        endDate: dto.endDate,
        registrationDeadline: dto.registrationDeadline,
        locationCity: dto.locationCity,
        locationCollege: dto.locationCollege,
        isOnline: dto.isOnline,
        latitude: dto.latitude,
        longitude: dto.longitude,
        tags: dto.tags,
        prizePool: dto.prizePool,
        prizeAmount: dto.prizeAmount,
        organizer: dto.organizer,
        coverImage: dto.coverImage,
        logoUrl: dto.logoUrl,
        status: dto.status,
        viewsCount: dto.viewsCount,
        avgRating: dto.avgRating,
        reviewsCount: dto.reviewsCount,
        submittedBy: dto.submittedBy,
        createdAt: dto.createdAt,
        updatedAt: dto.updatedAt,
        version: 1,
      },
      dto.id
    );
  }
}
