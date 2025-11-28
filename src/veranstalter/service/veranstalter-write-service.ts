import { Injectable, NotFoundException } from '@nestjs/common';
import { fileTypeFromBuffer } from 'file-type';
import {
    type Prisma,
    VeranstalterFile,
} from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { MailService } from '../../mail/mail-service.js';
import {
    VersionInvalidException,
    VersionOutdatedException,
} from './exceptions.js';
import { PrismaService } from './prisma-service.js';
import { VeranstalterService } from './veranstalter-service.js';

export type VeranstalterCreate = Prisma.VeranstalterCreateInput;
type VeranstalterCreated = Prisma.VeranstalterGetPayload<{
    include: { standort: true; teilnehmer: true };
}>;
export type VeranstalterUpdate = Prisma.VeranstalterUpdateInput;
export type UpdateParams = {
    readonly id: number | undefined;
    readonly veranstalter: VeranstalterUpdate;
    readonly version: string;
};
type VeranstalterUpdated = Prisma.VeranstalterGetPayload<{}>;
type VeranstalterFileCreate = Prisma.VeranstalterFileUncheckedCreateInput;
export type VeranstalterFileCreated = Prisma.VeranstalterFileGetPayload<{}>;

@Injectable()
export class VeranstalterWriteService {
    private static readonly VERSION_PATTERN = /^"\d{1,3}"/u;

    readonly #prismaService: PrismaService;
    readonly #readService: VeranstalterService;
    readonly #mailService: MailService;
    readonly #logger = getLogger(VeranstalterWriteService.name);

    constructor(
        prismaService: PrismaService,
        readService: VeranstalterService,
        mailService: MailService,
    ) {
        this.#prismaService = prismaService; // Hier direkt PrismaService speichern
        this.#readService = readService;
        this.#mailService = mailService;
    }

    async create(veranstalter: VeranstalterCreate): Promise<number> {
        this.#logger.debug('create: veranstalter=%o', veranstalter);
        let veranstalterDb: VeranstalterCreated | undefined;
        await this.#prismaService.client.$transaction(async (tx) => {
            veranstalterDb = await tx.veranstalter.create({
                data: veranstalter,
                include: { standort: true, teilnehmer: true },
            });
        });
        await this.#sendmail({
            id: veranstalterDb?.id ?? 'N/A',
            name: veranstalterDb?.name ?? 'N/A',
        });
        return veranstalterDb?.id ?? NaN;
    }

    async addFile(
        veranstalterId: number,
        data: Uint8Array,
        filename: string,
        size: number,
    ): Promise<Readonly<VeranstalterFile> | undefined> {
        this.#logger.debug(
            'addFile: veranstalterId=%d, filename=%s, size=%d',
            veranstalterId,
            filename,
            size,
        );
        let veranstalterFileCreated: VeranstalterFileCreated | undefined;
        await this.#prismaService.client.$transaction(async (tx) => {
            const veranstalter = await tx.veranstalter.findUnique({
                where: { id: veranstalterId },
            });
            if (!veranstalter)
                throw new NotFoundException(
                    `Es gibt keinen Veranstalter mit der ID ${veranstalterId}.`,
                );
            await tx.veranstalterFile.deleteMany({ where: { veranstalterId } });

            const fileType = await fileTypeFromBuffer(data);
            const mimetype = fileType?.mime ?? null;
            veranstalterFileCreated = await tx.veranstalterFile.create({
                data: {
                    filename,
                    data: Buffer.from(data),
                    mimetype,
                    veranstalterId,
                } as VeranstalterFileCreate,
            });
        });
        this.#logger.debug(
            'addFile: id=%d, byteLength=%d, filename=%s, mimetype=%s',
            veranstalterFileCreated?.id ?? NaN,
            veranstalterFileCreated?.data.byteLength ?? NaN,
            veranstalterFileCreated?.filename ?? 'undefined',
            veranstalterFileCreated?.mimetype ?? 'null',
        );
        return veranstalterFileCreated;
    }

    async update({ id, veranstalter, version }: UpdateParams): Promise<number> {
        if (id === undefined)
            throw new NotFoundException(
                `Es gibt keinen Veranstalter mit der ID ${id}.`,
            );
        await this.#validateUpdate(id, version);
        veranstalter.version = { increment: 1 };
        let veranstalterUpdated: VeranstalterUpdated | undefined;
        await this.#prismaService.client.$transaction(async (tx) => {
            veranstalterUpdated = await tx.veranstalter.update({
                where: { id },
                data: veranstalter,
            });
        });
        return veranstalterUpdated?.version ?? NaN;
    }

    async delete(id: number) {
        await this.#prismaService.client.$transaction(async (tx) => {
            await tx.veranstalter.delete({ where: { id } });
        });
    }

    async #sendmail({ id, name }: { id: number | 'N/A'; name: string }) {
        const subject = `Neuer Veranstalter ${id}`;
        const body = `Der Veranstalter mit dem Namen <strong>${name}</strong> ist angelegt`;
        await this.#mailService.sendmail({ subject, body });
    }

    async #validateUpdate(id: number, versionStr: string) {
        if (!VeranstalterWriteService.VERSION_PATTERN.test(versionStr))
            throw new VersionInvalidException(versionStr);
        const version = Number.parseInt(versionStr.slice(1, -1), 10);
        const veranstalterDb = await this.#readService.findById({ id });
        if (version < veranstalterDb.version)
            throw new VersionOutdatedException(version);
    }
}
