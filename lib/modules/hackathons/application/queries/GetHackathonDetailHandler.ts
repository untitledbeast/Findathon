import { Result, ok, err } from '@/lib/shared';
import { BaseError, NotFoundError } from '@/lib/errors';
import { RequestContext } from '@/lib/context/request-context';
import { IHackathonRepository } from '../../domain/repositories/IHackathonRepository';
import { HackathonDTO } from '../dtos/HackathonDTO';
import { HackathonMapper } from '../mappers/HackathonMapper';

export class GetHackathonDetailHandler {
  constructor(private readonly repository: IHackathonRepository) {}

  public async execute(context: RequestContext, id: string): Promise<Result<HackathonDTO, BaseError>> {
    const aggregate = await this.repository.findById(id);
    if (!aggregate) {
      return err(new NotFoundError(`Hackathon with ID ${id} not found`));
    }

    // Fire and forget view increment
    aggregate.incrementViews();
    this.repository.save(aggregate).catch(() => {});

    return ok(HackathonMapper.toDTO(aggregate));
  }
}
