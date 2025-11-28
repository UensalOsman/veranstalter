import { Injectable, NotFoundException } from '@nestjs/common';
import {
    Prisma,
    PrismaClient,
    VeranstalterFile,
} from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { type Pageable } from './pageable.js';
import { PrismaService } from './prisma-service.js';
import { type Slice } from './slice.js';
import { type Suchparameter, suchparameterNamen } from './suchparameter.js';
import { WhereBuilder } from './where-builder.js';

// Typdefinition für `findById`
type FindByIdParams = {
    readonly id: number;
    readonly mitTeilnehmer?: boolean;
};

export type VeranstalterMitStandort = Prisma.VeranstalterGetPayload<{
    include: { standort: true };
}>;

export type VeranstalterMitStandortUndTeilnehmer =
    Prisma.VeranstalterGetPayload<{
        include: { standort: true; veranstalterFile: true };
    }>;

/**
 * Die Klasse `VeranstalterService` implementiert das Lesen für Veranstalter
 * und greift mit Prisma auf die relationale DB zu.
 */
@Injectable()
export class VeranstalterService {
    static readonly ID_PATTERN = /^[1-9]\d{0,10}$/u;

    readonly #prisma: PrismaClient;
    readonly #whereBuilder: WhereBuilder;
    readonly #includeStandort: Prisma.VeranstalterInclude = { standort: true };
    readonly #includeStandortUndTeilnehmer: Prisma.VeranstalterInclude = {
        standort: true,
        veranstalterFile: true,
    };

    readonly #logger = getLogger(VeranstalterService.name);

    constructor(prisma: PrismaService, whereBuilder: WhereBuilder) {
        this.#prisma = prisma.client;
        this.#whereBuilder = whereBuilder;
    }

    async findById({
        id,
        mitTeilnehmer = false,
    }: FindByIdParams): Promise<
        Readonly<VeranstalterMitStandortUndTeilnehmer>
    > {
        this.#logger.debug('findById: id=%d', id);

        const include = mitTeilnehmer
            ? this.#includeStandortUndTeilnehmer
            : this.#includeStandort;

        const veranstalter: VeranstalterMitStandortUndTeilnehmer | null =
            await this.#prisma.veranstalter.findUnique({
                where: { id },
                include,
            });

        if (!veranstalter) {
            this.#logger.debug('Es gibt keinen Veranstalter mit der ID %d', id);
            throw new NotFoundException(
                `Es gibt keinen Veranstalter mit der ID ${id}.`,
            );
        }

        this.#logger.debug('findById: veranstalter=%o', veranstalter);
        return veranstalter;
    }

    async findFileByVeranstalterId(
        veranstalterId: number,
    ): Promise<Readonly<VeranstalterFile> | undefined> {
        this.#logger.debug(
            'findFileByVeranstalterId: veranstalterId=%d',
            veranstalterId,
        );
        const veranstalterFile: VeranstalterFile | null =
            await this.#prisma.veranstalterFile.findUnique({
                where: { veranstalterId },
            });
        if (veranstalterFile === null) {
            this.#logger.debug('findFileById: Keine Datei gefunden');
            return;
        }

        this.#logger.debug(
            'findFileByVeranstalterId: id=%s, byteLength=%d, filename=%s, mimetype=%s, veranstalterId=%d',
            veranstalterFile.id,
            veranstalterFile.data.byteLength,
            veranstalterFile.filename,
            veranstalterFile.mimetype ?? 'undefined',
            veranstalterFile.veranstalterId,
        );

        return veranstalterFile;
    }

    async find(
        suchparameter: Suchparameter | undefined,
        pageable: Pageable,
    ): Promise<Readonly<Slice<Readonly<VeranstalterMitStandort>>>> {
        this.#logger.debug(
            'find: suchparameter=%s, pageable=%o',
            JSON.stringify(suchparameter),
            pageable,
        );

        if (!suchparameter || Object.keys(suchparameter).length === 0) {
            return await this.#findAll(pageable);
        }

        const keys = Object.keys(suchparameter);
        if (!this.#checkKeys(keys)) {
            this.#logger.debug('Ungueltige Suchparameter');
            throw new NotFoundException('Ungueltige Suchparameter');
        }

        const where = this.#whereBuilder.build(suchparameter);
        const { number, size } = pageable;

        const list: VeranstalterMitStandort[] =
            await this.#prisma.veranstalter.findMany({
                where,
                skip: number * size,
                take: size,
                include: this.#includeStandort,
            });

        if (list.length === 0) {
            this.#logger.debug('find: Keine Veranstalter gefunden');
            throw new NotFoundException(
                `Keine Veranstalter gefunden: ${JSON.stringify(
                    suchparameter,
                )}, Seite ${pageable.number}`,
            );
        }

        // ✅ totalElements nur für die gefilterten Ergebnisse
        const totalElements = await this.#prisma.veranstalter.count({ where });

        return this.#createSlice(list, totalElements);
    }

    async count() {
        this.#logger.debug('count');
        const count = await this.#prisma.veranstalter.count();
        this.#logger.debug('count: %d', count);
        return count;
    }

    async #findAll(
        pageable: Pageable,
    ): Promise<Readonly<Slice<VeranstalterMitStandort>>> {
        const { number, size } = pageable;
        const list: VeranstalterMitStandort[] =
            await this.#prisma.veranstalter.findMany({
                skip: number * size,
                take: size,
                include: this.#includeStandort,
            });

        if (list.length === 0) {
            this.#logger.debug('#findAll: Keine Veranstalter gefunden');
            throw new NotFoundException(`Ungueltige Seite "${number}"`);
        }

        const totalElements = await this.count();
        return this.#createSlice(list, totalElements);
    }

    #createSlice(
        list: VeranstalterMitStandort[],
        totalElements: number,
    ): Readonly<Slice<VeranstalterMitStandort>> {
        const slice: Slice<VeranstalterMitStandort> = {
            content: list,
            totalElements,
        };
        this.#logger.debug('createSlice: slice=%o', slice);
        return slice;
    }

    #checkKeys(keys: string[]) {
        this.#logger.debug('#checkKeys: keys=%o', keys);
        return keys.every((key) => suchparameterNamen.includes(key));
    }
}
