import { RequestContext } from '../context/request-context';
import { Result, ok, err } from '../errors/result';
import { BaseError, AuthenticationError, PermissionError, NotFoundError, ConflictError } from '../errors';
import { ReviewDTO, PaginationParams } from '@/types';
import { IReviewRepository } from '../domain/repositories/review.repository.interface';
import { IHackathonRepository } from '../domain/repositories/hackathon.repository.interface';
import { ReviewEligibilityPolicy } from '../domain/policies';
import { ReviewFactory } from '../domain/factories';
import { IEventBus } from '../domain/events/event-bus';

export class ReviewQueryService {
  constructor(private reviewRepo: IReviewRepository) {}

  public async getByHackathon(
    _context: RequestContext,
    hackathonId: string,
    pagination: PaginationParams
  ): Promise<Result<{ reviews: ReviewDTO[]; average: number; total: number }, BaseError>> {
    try {
      const result = await this.reviewRepo.findByHackathon(hackathonId, pagination);
      const avg = await this.reviewRepo.getAverageRating(hackathonId);
      return ok({ reviews: result.data, average: avg, total: result.total });
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to fetch reviews'));
    }
  }
}

export class ReviewCommandService {
  constructor(
    private reviewRepo: IReviewRepository,
    private hackathonRepo: IHackathonRepository,
    private eventBus: IEventBus
  ) {}

  public async create(
    context: RequestContext,
    input: {
      hackathonId: string;
      rating: number;
      title: string;
      body: string;
      organizationQuality: number;
      prizeTransparency: number;
      mentorship: number;
    }
  ): Promise<Result<ReviewDTO, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());

      const hackathon = await this.hackathonRepo.findById(input.hackathonId);
      if (!hackathon) return err(new NotFoundError(`Hackathon ${input.hackathonId} not found`));

      const existing = await this.reviewRepo.findOne(context.user.id, input.hackathonId);
      if (existing) return err(new ConflictError('You have already submitted a review for this hackathon'));

      const entity = ReviewFactory.createNew({
        hackathonId: input.hackathonId,
        userId: context.user.id,
        rating: input.rating,
        title: input.title,
        body: input.body,
        organizationQuality: input.organizationQuality,
        prizeTransparency: input.prizeTransparency,
        mentorship: input.mentorship
      });

      const dto = await this.reviewRepo.create({
        hackathonId: entity.hackathonId,
        userId: entity.userId,
        rating: entity.rating.getValue(),
        title: entity.title,
        body: entity.body,
        organizationQuality: entity.organizationQuality.getValue(),
        prizeTransparency: entity.prizeTransparency.getValue(),
        mentorship: entity.mentorship.getValue(),
        profile: null
      });

      await this.eventBus.publish({
        eventId: `evt_${Date.now()}`,
        eventName: 'ReviewCreated',
        timestamp: new Date().toISOString(),
        userId: context.user.id,
        reviewId: dto.id,
        hackathonId: dto.hackathonId,
        rating: dto.rating
      });

      return ok(dto);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to create review'));
    }
  }

  public async delete(context: RequestContext, reviewId: string): Promise<Result<void, BaseError>> {
    try {
      if (!context.user) return err(new AuthenticationError());

      const userReviews = await this.reviewRepo.findByUser(context.user.id);
      const review = userReviews.find(r => r.id === reviewId);
      if (!review) return err(new NotFoundError('Review not found'));

      const canDelete = ReviewEligibilityPolicy.canDeleteReview(
        { userId: context.user.id, role: context.role },
        review.userId
      );
      if (!canDelete) return err(new PermissionError());

      await this.reviewRepo.delete(reviewId);
      return ok(undefined);
    } catch (e) {
      return err(e instanceof BaseError ? e : new BaseError('Failed to delete review'));
    }
  }
}
