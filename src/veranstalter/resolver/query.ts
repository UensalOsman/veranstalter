// src/veranstalter/controller/veranstalter-query-resolver.ts
import { UseFilters, UseInterceptors } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { Public } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { createPageable } from '../service/pageable.js';
import { Slice } from '../service/slice.js';
import { Suchparameter } from '../service/suchparameter.js';
import {
    VeranstalterService,
    type VeranstalterMitStandort,
    type VeranstalterMitStandortUndTeilnehmer,
} from '../service/veranstalter-service.js';
import { HttpExceptionFilter } from './http-exception-filter.js';

export type IdInput = { readonly id: string };
export type SuchparameterInput = {
    readonly suchparameter: Omit<Suchparameter, 'aktiv'> & { aktiv?: boolean };
};

@Resolver('Veranstalter')
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class VeranstalterQueryResolver {
    readonly #service: VeranstalterService;
    readonly #logger = getLogger(VeranstalterQueryResolver.name);

    constructor(service: VeranstalterService) {
        this.#service = service;
    }

    @Query('veranstalter')
    @Public()
    async findById(
        @Args() { id }: IdInput,
    ): Promise<Readonly<VeranstalterMitStandortUndTeilnehmer>> {
        this.#logger.debug('findById: id=%s', id);
        const veranstalter = await this.#service.findById({ id: Number(id) });
        return veranstalter!;
    }

    @Query('veranstalter')
    @Public()
    async find(
        @Args() input?: SuchparameterInput,
    ): Promise<VeranstalterMitStandort[]> {
        const pageable = createPageable({});
        const suchparameter = input?.suchparameter;
        if (suchparameter?.aktiv !== undefined) {
            (suchparameter as any).aktiv = suchparameter.aktiv.toString();
        }
        const slice: Readonly<Slice<Readonly<VeranstalterMitStandort>>> =
            await this.#service.find(suchparameter as any, pageable);
        return slice.content;
    }
}
