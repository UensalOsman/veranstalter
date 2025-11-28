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

/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle
 * für Veranstalter.
 * @packageDocumentation
 */

import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    NotFoundException,
    Param,
    ParseIntPipe,
    Query,
    Req,
    Res,
    StreamableFile,
    UseInterceptors,
} from '@nestjs/common';
import {
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { Public } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import { createPageable } from '../service/pageable.js';
import { type Suchparameter } from '../service/suchparameter.js';
import {
    VeranstalterMitStandort,
    VeranstalterService,
} from '../service/veranstalter-service.js';
import { createPage, Page } from './page.js';

export class VeranstalterQuery implements Suchparameter {
    @ApiProperty({ required: false })
    declare readonly name?: string;

    @ApiProperty({ required: false })
    declare readonly ort?: string;

    @ApiProperty({ required: false })
    declare readonly land?: string;

    @ApiProperty({ required: false })
    declare readonly art?: string;

    @ApiProperty({ required: false })
    declare readonly email?: string;

    @ApiProperty({ required: false })
    declare readonly telefon?: string;

    @ApiProperty({ required: false })
    declare size?: string;

    @ApiProperty({ required: false })
    declare page?: string;

    @ApiProperty({ required: false })
    declare only?: 'count';
}

export type CountResult = Record<'count', number>;

@Controller(paths.rest)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Veranstalter REST-API')
export class VeranstalterController {
    readonly #service: VeranstalterService;
    readonly #logger = getLogger(VeranstalterController.name);

    constructor(service: VeranstalterService) {
        this.#service = service;
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Suche mit der Veranstalter-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Der Veranstalter wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein Veranstalter zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Der Veranstalter wurde bereits heruntergeladen',
    })
    async getById(
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response<VeranstalterMitStandort>> {
        this.#logger.debug('getById: id=%d, version=%s', id, version ?? '-1');

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('getById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const veranstalter = await this.#service.findById({ id });
        this.#logger.debug('getById: veranstalter=%o', veranstalter);

        const versionDb = veranstalter.version;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('getById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        res.header('ETag', `"${versionDb}"`);

        return res.json(veranstalter);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Suche mit Suchparameter' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Veranstaltern' })
    async get(
        @Query() query: VeranstalterQuery,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<
        Response<Page<Readonly<VeranstalterMitStandort>> | CountResult>
    > {
        this.#logger.debug('get: query=%o', query);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('get: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const { only } = query;
        if (only !== undefined) {
            const count = await this.#service.count();
            return res.json({ count: count });
        }

        const { page, size } = query;
        delete query['page'];
        delete query['size'];

        const keys = Object.keys(query) as (keyof VeranstalterQuery)[];
        keys.forEach((key) => {
            if (query[key] === undefined) delete query[key];
        });

        const pageable = createPageable({ number: page, size });
        const veranstalterSlice = await this.#service.find(query, pageable);
        const veranstalterPage = createPage(veranstalterSlice, pageable);

        return res.json(veranstalterPage).send();
    }

    @Get('/file/:id')
    @Public()
    @ApiOperation({ description: 'Suche nach Datei mit der Veranstalter-ID' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 1',
    })
    @ApiNotFoundResponse({
        description: 'Keine Datei zur Veranstalter-ID gefunden',
    })
    @ApiOkResponse({ description: 'Die Datei wurde gefunden' })
    async getFileById(
        @Param('id') idStr: string,
        @Res({ passthrough: true }) res: Response,
    ): Promise<StreamableFile> {
        const id = Number(idStr);
        if (!Number.isInteger(id)) {
            throw new NotFoundException(
                `Die Veranstalter-ID ${idStr} ist ungueltig.`,
            );
        }

        const veranstalterFile =
            await this.#service.findFileByVeranstalterId(id);
        if (veranstalterFile?.data === undefined) {
            throw new NotFoundException('Keine Datei gefunden.');
        }

        res.contentType(veranstalterFile.mimetype ?? 'image/png').set({
            'Content-Disposition': `inline; filename="${veranstalterFile.filename}"`,
        });
        return new StreamableFile(veranstalterFile.data);
    }
}
