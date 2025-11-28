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

describe('VeranstalterService find', () => {
    let service: VeranstalterService;
    let prismaServiceMock: PrismaService;

    beforeEach(() => {
        const findManyMock = vi.fn<PrismaClient['veranstalter']['findMany']>();
        const countMock = vi.fn<PrismaClient['veranstalter']['count']>();
        prismaServiceMock = {
            client: {
                veranstalter: {
                    findMany: findManyMock,
                    count: countMock,
                },
            },
        } as any;

        const whereBuilder = new WhereBuilder();
        service = new VeranstalterService(prismaServiceMock, whereBuilder);
    });

    test('name vorhanden', async () => {
        // given
        const name = 'Veranstalter 1';
        const suchparameter = { name };
        const pageable = { number: 1, size: 5 };
        const veranstalterMock = {
            id: 1,
            version: 0,
            name,
            email: 'test@example.com',
            art: 'ONLINE',
            aktiv: true,
            standort: {
                id: 10,
                strasse: 'Musterstraße 1',
                plz: '12345',
                ort: 'Berlin',
                land: 'Deutschland',
                veranstalter_id: 1,
            },
        };
        (
            prismaServiceMock.client.veranstalter.findMany as any
        ).mockResolvedValueOnce([veranstalterMock]);
        (
            prismaServiceMock.client.veranstalter.count as any
        ).mockResolvedValueOnce(1);

        // when
        const result = await service.find(suchparameter, pageable);

        // then
        const { content } = result;

        expect(content).toHaveLength(1);
        expect(content[0]).toStrictEqual(veranstalterMock);
    });

    test('name nicht vorhanden', async () => {
        // given
        const name = 'NichtVorhanden';
        const suchparameter = { name };
        const pageable = { number: 1, size: 5 };
        (
            prismaServiceMock.client.veranstalter.findMany as any
        ).mockResolvedValue([]);

        // when / then
        await expect(service.find(suchparameter, pageable)).rejects.toThrow(
            /^Keine Veranstalter gefunden/,
        );
    });
});
