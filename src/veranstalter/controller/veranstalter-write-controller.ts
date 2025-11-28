/* eslint-disable max-lines */
// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle
 * für Veranstalter.
 * @packageDocumentation
 */

import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpCode,
    HttpStatus,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Req,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { type MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiForbiddenResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiParam,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import { type Request, type Response } from 'express';
import { AuthGuard, Public, Roles } from 'nest-keycloak-connect';
import { paths } from '../../config/paths.js';
import { getLogger } from '../../logger/logger.js';
import { ResponseTimeInterceptor } from '../../logger/response-time.js';
import {
    VeranstalterCreate,
    type VeranstalterFileCreated,
    VeranstalterUpdate,
    VeranstalterWriteService,
} from '../service/veranstalter-write-service.js';
import { createBaseUri } from './create-base-uri.js';
import { InvalidMimeTypeException } from './exceptions.js';
import { VeranstalterDTO, VeranstalterDtoOhneRef } from './veranstalter-dto.js';

const MSG_FORBIDDEN = 'Kein Token mit ausreichender Berechtigung vorhanden';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
const MIME_TYPES = ['image/png', 'image/jpeg', 'application/pdf'];
const MULTER_OPTIONS: MulterOptions = {
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (_: any, file: any, cb: any) => {
        if (!MIME_TYPES.includes(file.mimetype)) {
            return cb(new InvalidMimeTypeException(file.mimetype), false);
        }
        cb(null, true);
    },
};

/**
 * Die Controller-Klasse für die Verwaltung von Veranstaltern.
 */
@Controller(paths.rest)
@UseGuards(AuthGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('Veranstalter REST-API')
@ApiBearerAuth()
export class VeranstalterWriteController {
    readonly #service: VeranstalterWriteService;

    readonly #logger = getLogger(VeranstalterWriteController.name);

    constructor(service: VeranstalterWriteService) {
        this.#service = service;
    }

    /**
     * Ein neuer Veranstalter wird asynchron angelegt. Die JSON-Daten sind im Request-Body enthalten.
     * Bei erfolgreicher Anlage wird der Statuscode `201` (`Created`) zurückgegeben.
     */
    @Post()
    @Roles('admin')
    @ApiOperation({ summary: 'Einen neuen Veranstalter anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Veranstalterdaten' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async post(
        @Body() veranstalterDTO: VeranstalterDTO,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug('post: veranstalterDTO=%o', veranstalterDTO);

        const veranstalter =
            this.#veranstalterDtoToCreateInput(veranstalterDTO);
        const id = await this.#service.create(veranstalter);

        const location = `${createBaseUri(req)}/${id}`;
        this.#logger.debug('post: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Zu einem gegebenen Veranstalter kann eine Datei (z.B. PDF oder Bild) hochgeladen werden.
     */
    // eslint-disable-next-line max-params
    @Post(':id')
    @Public()
    @UseInterceptors(FileInterceptor('file', MULTER_OPTIONS))
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Datei zu einem Veranstalter hochladen' })
    @ApiParam({ name: 'id', description: 'Z.B. 1' })
    @ApiCreatedResponse({ description: 'Erfolgreich hinzugefügt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Datei' })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async addFile(
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @UploadedFile() file: Express.Multer.File,
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<Response> {
        const { buffer, originalname, size } = file;
        this.#logger.debug(
            'addFile: id=%d, originalname=%s, size=%d, options=%o',
            id,
            originalname,
            size,
            MULTER_OPTIONS,
        );

        const fileCreated: VeranstalterFileCreated | undefined =
            await this.#service.addFile(id, buffer, originalname, size);
        this.#logger.debug(
            'addFile: id=%d, byteLength=%d, filename=%s, mimetype=%s',
            fileCreated?.id ?? -1,
            fileCreated?.data.byteLength ?? -1,
            fileCreated?.filename ?? 'undefined',
            fileCreated?.mimetype ?? 'null',
        );

        const location = `${createBaseUri(req)}/file/${id}`;
        this.#logger.debug('addFile: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Ein vorhandener Veranstalter wird asynchron aktualisiert.
     * Der Header `If-Match` muss die aktuelle Version für optimistische Synchronisation enthalten.
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    @Roles('admin', 'user')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Einen vorhandenen Veranstalter aktualisieren' })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Veranstalterdaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async put(
        @Body() veranstalterDTO: VeranstalterDtoOhneRef,
        @Param(
            'id',
            new ParseIntPipe({ errorHttpStatusCode: HttpStatus.NOT_FOUND }),
        )
        id: number,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ): Promise<Response> {
        this.#logger.debug(
            'put: id=%d, veranstalterDTO=%o, version=%s',
            id,
            veranstalterDTO,
            version ?? 'undefined',
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('put: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'application/json')
                .send(msg);
        }

        const veranstalter = this.#veranstalterDtoToUpdate(veranstalterDTO);
        const neueVersion = await this.#service.update({
            id,
            veranstalter,
            version,
        });
        this.#logger.debug('put: version=%d', neueVersion);
        return res.header('ETag', `"${neueVersion}"`).send();
    }

    /**
     * Ein Veranstalter wird anhand seiner ID gelöscht.
     */
    @Delete(':id')
    @Roles('admin')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Veranstalter mit der ID löschen' })
    @ApiNoContentResponse({
        description: 'Der Veranstalter wurde gelöscht oder war nicht vorhanden',
    })
    @ApiForbiddenResponse({ description: MSG_FORBIDDEN })
    async delete(@Param('id') id: number) {
        this.#logger.debug('delete: id=%d', id);
        await this.#service.delete(id);
    }

    // --- Private Mapper-Methoden ---

    #veranstalterDtoToCreateInput(dto: VeranstalterDTO): VeranstalterCreate {
        dto.dokumente?.map(
            (dokumentDTO: {
                titel: any;
                beschreibung: any;
                dateiname: any;
            }) => ({
                titel: dokumentDTO.titel,
                beschreibung: dokumentDTO.beschreibung ?? null,
                dateiname: dokumentDTO.dateiname,
            }),
        );

        const standort: any = dto.standort
            ? {
                  create: {
                      strasse: dto.standort.strasse ?? null,
                      ort: dto.standort.ort ?? null,
                      plz: dto.standort.plz ?? null,
                  },
              }
            : undefined;

        dto.standort
            ? {
                  create: {
                      strasse: dto.standort.strasse,
                      ort: dto.standort.ort,
                      plz: dto.standort.plz,
                  },
              }
            : undefined;

        const veranstalter: VeranstalterCreate = {
            version: 0,
            name: dto.name,
            email: dto.email ?? '',
            telefon: dto.telefon ?? null,
            aktiv: dto.aktiv ?? true,
            standort,
        };
        return veranstalter;
    }

    #veranstalterDtoToUpdate(dto: VeranstalterDtoOhneRef): VeranstalterUpdate {
        return {
            version: 0,
            name: dto.name,
            email: dto.email ?? '',
            telefon: dto.telefon ?? null,
            aktiv: dto.aktiv ?? true,
        };
    }
}
/* eslint-enable max-lines */
