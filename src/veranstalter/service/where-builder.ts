import { Injectable } from '@nestjs/common';
import { Prisma, veranstalterart } from '../../generated/prisma/client.js';
import { getLogger } from '../../logger/logger.js';
import { type Suchparameter } from './suchparameter.js';

/**
 * Die Klasse `WhereBuilder` baut die WHERE-Klausel für DB-Anfragen mit Prisma.
 */
@Injectable()
export class WhereBuilder {
    readonly #logger = getLogger(WhereBuilder.name);

    /**
     * WHERE-Klausel für die flexible Suche nach Veranstaltern bauen.
     * @param suchparameter JSON-Objekt mit Suchparametern
     * @returns Prisma.VeranstalterWhereInput
     */
    build(suchparameter: Suchparameter): Prisma.VeranstalterWhereInput {
        this.#logger.debug('build: suchparameter=%o', suchparameter);

        let where: Prisma.VeranstalterWhereInput = {};

        Object.entries(suchparameter).forEach(([key, value]) => {
            if (value === undefined) return;

            switch (key) {
                case 'id':
                    where.id = Number(value);
                    break;
                case 'name':
                    where.name = {
                        contains: value as string,
                        mode: Prisma.QueryMode.insensitive,
                    };
                    break;
                case 'art':
                    where.art = value as veranstalterart;
                    break;
                case 'email':
                    where.email = { equals: value as string };
                    break;
                case 'aktiv':
                    where.aktiv = {
                        equals: (value as string).toLowerCase() === 'true',
                    };
                    break;
                default:
                    this.#logger.debug(
                        'build: unbekannter Parameter ignored: %s',
                        key,
                    );
            }
        });

        this.#logger.debug('build: where=%o', where);
        return where;
    }
}
