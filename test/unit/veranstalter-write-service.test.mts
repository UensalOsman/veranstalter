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
import { MailService } from '../../src/mail/mail-service.js';
import { PrismaService } from '../../src/veranstalter/service/prisma-service.js';
import { VeranstalterService } from '../../src/veranstalter/service/veranstalter-service.js';
import {
    type VeranstalterCreate,
    VeranstalterWriteService,
} from '../../src/veranstalter/service/veranstalter-write-service.js';
import { WhereBuilder } from '../../src/veranstalter/service/where-builder.js';

describe('VeranstalterWriteService create', () => {
    let service: VeranstalterWriteService;
    let prismaServiceMock: PrismaService;
    let readService: VeranstalterService;
    let mailService: MailService;
    let veranstalterCreateMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        veranstalterCreateMock = vi.fn<any>();
        const transactionMock = vi
            .fn<any>()
            .mockImplementation(async (cb: any) => {
                // Mock-Objekt für die Transaktion
                const tx = {
                    veranstalter: { create: veranstalterCreateMock },
                };
                await cb(tx);
            });

        prismaServiceMock = {
            client: {
                $transaction: transactionMock,
            } as unknown,
        } as PrismaService;

        const whereBuilder = new WhereBuilder(); // Mock-Objekt für WhereBuilder

        readService = new VeranstalterService(prismaServiceMock, whereBuilder);
        mailService = new MailService();

        service = new VeranstalterWriteService(
            prismaServiceMock,
            readService,
            mailService,
        );
    });

    test('Neuer Veranstalter', async () => {
        // given
        const idMock = 1;
        const veranstalter: VeranstalterCreate = {
            name: 'Test Veranstalter',
            email: 'test@example.com',
            aktiv: true,
            art: 'ONLINE',
            standort: {
                create: {
                    strasse: 'Musterstraße 2a',
                    plz: '12345',
                    ort: 'Stadt',
                    land: 'Deutschland',
                },
            },
        };

        const veranstalterMockTemp: any = { ...veranstalter };
        veranstalterMockTemp.id = idMock;
        veranstalterCreateMock.mockResolvedValue(veranstalterMockTemp);

        // when
        const id = await service.create(veranstalter);

        // then
        expect(id).toBe(idMock);
    });
});
