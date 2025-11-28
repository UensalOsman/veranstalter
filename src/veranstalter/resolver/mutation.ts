// Copyright (C) 2025 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program. If not, see <https://www.gnu.org/licenses/>.

// eslint-disable-next-line max-classes-per-file
import { UseFilters, UseGuards, UseInterceptors } from '@nestjs/common';
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { IsInt, IsNumberString, Min } from 'class-validator';
import { AuthGuard, Roles } from 'nest-keycloak-connect';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { VeranstalterDTO } from '../controller/veranstalter-dto.js';
import {
    VeranstalterCreate,
    VeranstalterUpdate,
    VeranstalterWriteService,
} from '../service/veranstalter-write-service.js';
import { HttpExceptionFilter } from './http-exception-filter.js';
import { type IdInput } from './query.js';

// -------------------------------------------------------------
// Authentifizierung und Autorisierung
// -------------------------------------------------------------

export type CreatePayload = {
    readonly id: number;
};

export type UpdatePayload = {
    readonly version: number;
};

export type DeletePayload = {
    readonly success: boolean;
};

// DTO-Klasse für Update-Mutation
export class VeranstalterUpdateDTO extends VeranstalterDTO {
    @IsNumberString()
    readonly id!: string;

    @IsInt()
    @Min(0)
    readonly version!: number;
}

@Resolver('Veranstalter')
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(AuthGuard)
@UseFilters(HttpExceptionFilter)
@UseInterceptors(ResponseTimeInterceptor)
export class VeranstalterMutationResolver {
    readonly #service: VeranstalterWriteService;

    readonly #logger = getLogger(VeranstalterMutationResolver.name);

    constructor(service: VeranstalterWriteService) {
        this.#service = service;
    }

    // -------------------------------------------------------------
    // Mutation: CREATE
    // -------------------------------------------------------------
    @Mutation()
    @Roles('admin', 'user')
    async create(@Args('input') veranstalterDTO: VeranstalterDTO) {
        this.#logger.debug('create: veranstalterDTO=%o', veranstalterDTO);

        const veranstalter =
            this.#veranstalterDtoToVeranstalterCreate(veranstalterDTO);
        const id = await this.#service.create(veranstalter);
        this.#logger.debug('createVeranstalter: id=%d', id);

        const payload: CreatePayload = { id };
        return payload;
    }

    // -------------------------------------------------------------
    // Mutation: UPDATE
    // -------------------------------------------------------------
    @Mutation()
    @Roles('admin', 'user')
    async update(@Args('input') veranstalterDTO: VeranstalterUpdateDTO) {
        this.#logger.debug('update: veranstalter=%o', veranstalterDTO);

        const veranstalter =
            this.#veranstalterUpdateDtoToVeranstalterUpdate(veranstalterDTO);
        const versionStr = `"${veranstalterDTO.version.toString()}"`;

        const versionResult = await this.#service.update({
            id: Number.parseInt(veranstalterDTO.id, 10),
            veranstalter,
            version: versionStr,
        });

        this.#logger.debug(
            'updateVeranstalter: versionResult=%d',
            versionResult,
        );

        const payload: UpdatePayload = { version: versionResult };
        return payload;
    }

    // -------------------------------------------------------------
    // Mutation: DELETE
    // -------------------------------------------------------------
    @Mutation()
    @Roles('admin')
    async delete(@Args() id: IdInput) {
        const idValue = id.id;
        this.#logger.debug('delete: idValue=%s', idValue);

        await this.#service.delete(Number(idValue));

        const payload: DeletePayload = { success: true };
        return payload;
    }

    // -------------------------------------------------------------
    // Mapper: DTO → Create
    // -------------------------------------------------------------
    #veranstalterDtoToVeranstalterCreate(
        veranstalterDTO: VeranstalterDTO,
    ): VeranstalterCreate {
        const teilnehmer = veranstalterDTO.teilnehmer?.map((teilnehmerDTO) => ({
            vorname: teilnehmerDTO.vorname,
            nachname: teilnehmerDTO.nachname,
            email: teilnehmerDTO.email ?? '',
        }));

        const veranstalter: VeranstalterCreate = {
            version: 0,
            name: veranstalterDTO.name,
            email: veranstalterDTO.email ?? '',
            telefon: veranstalterDTO.telefon ?? null,
            aktiv: veranstalterDTO.aktiv ?? false,
            standort: {
                create: {
                    ort: veranstalterDTO.standort.ort,
                    plz: veranstalterDTO.standort.plz ?? '',
                    strasse: veranstalterDTO.standort.strasse ?? '',
                },
            },
            teilnehmer: {
                create: teilnehmer ?? [],
            },
        };
        return veranstalter;
    }

    // -------------------------------------------------------------
    // Mapper: DTO → Update
    // -------------------------------------------------------------
    #veranstalterUpdateDtoToVeranstalterUpdate(
        veranstalterDTO: VeranstalterUpdateDTO,
    ): VeranstalterUpdate {
        const update: any = {};

        // only add properties when they are provided to avoid "property: undefined"
        if (veranstalterDTO.name !== undefined)
            update.name = veranstalterDTO.name;
        if (veranstalterDTO.email !== undefined)
            update.email = veranstalterDTO.email;

        // preserve explicit null for nullable fields; omit when undefined
        if (Object.prototype.hasOwnProperty.call(veranstalterDTO, 'telefon'))
            update.telefon = veranstalterDTO.telefon ?? null;
        if (veranstalterDTO.aktiv !== undefined)
            update.aktiv = veranstalterDTO.aktiv;

        if (veranstalterDTO.standort) {
            update.standort = {
                update: {
                    ort: veranstalterDTO.standort.ort,
                    plz: veranstalterDTO.standort.plz ?? '',
                    strasse: veranstalterDTO.standort.strasse ?? null,
                },
            } as any;
        }

        return update as VeranstalterUpdate;
    }

    // -------------------------------------------------------------
    // Fehlerbehandlung (optional reaktivierbar)
    // -------------------------------------------------------------
    // #errorMsgCreateVeranstalter(err: CreateError) {
    //     switch (err.type) {
    //         case 'EmailExists': {
    //             return `Die E-Mail ${err.email} existiert bereits`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }

    // #errorMsgUpdateVeranstalter(err: UpdateError) {
    //     switch (err.type) {
    //         case 'VeranstalterNotExists': {
    //             return `Es gibt keinen Veranstalter mit der ID ${err.id}`;
    //         }
    //         case 'VersionInvalid': {
    //             return `"${err.version}" ist keine gültige Versionsnummer`;
    //         }
    //         case 'VersionOutdated': {
    //             return `Die Versionsnummer "${err.version}" ist nicht mehr aktuell`;
    //         }
    //         default: {
    //             return 'Unbekannter Fehler';
    //         }
    //     }
    // }
}
