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

import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PrismaClient } from '../../src/generated/prisma/client.js';
import { PrismaService } from '../../src/veranstalter/service/prisma-service.js';
import { VeranstalterService } from '../../src/veranstalter/service/veranstalter-service.js';
import { WhereBuilder } from '../../src/veranstalter/service/where-builder.js';

describe('VeranstalterService findById', () => {
    let service: VeranstalterService;
    let prismaServiceMock: PrismaService;

    beforeEach(() => {
        const findUniqueMock =
            vi.fn<PrismaClient['veranstalter']['findUnique']>();
        prismaServiceMock = {
            client: {
                veranstalter: {
                    findUnique: findUniqueMock,
                },
            },
        } as any;

        const whereBuilder = new WhereBuilder();
        service = new VeranstalterService(prismaServiceMock, whereBuilder);
    });

    test('id vorhanden', async () => {
        // given
        const id = 1;
        const veranstalterMock = {
            id,
            version: 0,
            name: 'Veranstalter 1',
            email: 'test@example.com',
            art: 'ONLINE',
            aktiv: true,
            standort: {
                id: 10,
                strasse: 'Musterstraße 1',
                plz: '12345',
                ort: 'Berlin',
                land: 'Deutschland',
                veranstalter_id: id,
            },
        };
        (
            prismaServiceMock.client.veranstalter.findUnique as any
        ).mockResolvedValueOnce(veranstalterMock);

        // when
        const veranstalter = await service.findById({ id });

        // then
        expect(veranstalter).toStrictEqual(veranstalterMock);
    });

    test('id nicht vorhanden', async () => {
        // given
        const id = 999;
        (
            prismaServiceMock.client.veranstalter.findUnique as any
        ).mockResolvedValue(null);

        // when / then
        await expect(service.findById({ id })).rejects.toThrow(
            `Es gibt kein Veranstalter mit der ID ${id}.`,
        );
    });
});
