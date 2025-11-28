// Copyright (C) 2025 - present Osman Uensal
//
// Dieses Programm ist freie Software: Sie können es unter den Bedingungen der
// GNU General Public License weitergeben und/oder modifizieren, wie sie von
// der Free Software Foundation veröffentlicht wurde, entweder Version 3 der
// Lizenz oder jeder späteren Version.
//
// Dieses Programm wird in der Hoffnung verbreitet, dass es nützlich ist,
// aber OHNE JEDE GARANTIE, auch ohne die implizite Garantie der
// MARKTGÄNGIGKEIT oder EIGNUNG FÜR EINEN BESTIMMTEN ZWECK.
// Sie sollten eine Kopie der Lizenz erhalten haben:
// <https://www.gnu.org/licenses/>.

import { HttpStatus } from '@nestjs/common';
import { beforeAll, describe, expect, test } from 'vitest';
import { type VeranstalterDTO } from '../../../src/veranstalter/controller/veranstalter-dto.js';
import { VeranstalterService } from '../../../src/veranstalter/service/veranstalter-service.js';
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    LOCATION,
    POST,
    restURL,
} from '../constants.mjs';
import { getToken } from '../token.mjs';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuerVeranstalter: VeranstalterDTO = {
    name: 'EventPro Karlsruhe',
    email: 'info@eventpro.de',
    telefon: '+49 721 111111',
    art: 'PRAESENZ',
    aktiv: true,
    standort: {
        strasse: 'Hauptstrasse 5',
        plz: '76133',
        ort: 'Karlsruhe',
        land: 'Deutschland',
    },
};

const neuerVeranstalterInvalid: Record<string, unknown> = {
    name: '?',
    email: 'ungültig-email',
    telefon: '',
    art: 'UNGUELTIG',
    standort: {
        strasse: '',
        plz: '12',
        ort: '',
        land: '',
    },
};

const veranstalterNameExistiert: VeranstalterDTO = {
    name: 'Acme Events',
    email: 'acme@events.de',
    telefon: '+49 721 222222',
    art: 'ONLINE',
    aktiv: true,
    standort: {
        strasse: 'Testweg 1',
        plz: '76133',
        ort: 'Karlsruhe',
        land: 'Deutschland',
    },
};

type MessageType = { message: string };

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('POST /rest', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Neuer Veranstalter', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(`${restURL}/`, {
            method: POST,
            body: JSON.stringify(neuerVeranstalter),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const responseHeaders = response.headers;
        const location = responseHeaders.get(LOCATION);

        expect(location).toBeDefined();

        // ID nach dem letzten "/"
        const indexLastSlash = location?.lastIndexOf('/') ?? -1;

        expect(indexLastSlash).not.toBe(-1);

        const idStr = location?.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(VeranstalterService.ID_PATTERN.test(idStr ?? '')).toBe(true);
    });

    test.concurrent('Neuer Veranstalter mit ungueltigen Daten', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        const expectedMsg = [
            expect.stringMatching(/^name /u),
            expect.stringMatching(/^email /u),
            expect.stringMatching(/^telefon /u),
            expect.stringMatching(/^art /u),
            expect.stringMatching(/^standort.strasse /u),
            expect.stringMatching(/^standort.plz /u),
            expect.stringMatching(/^standort.ort /u),
            expect.stringMatching(/^standort.land /u),
        ];

        // when
        const response = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerVeranstalterInvalid),
            headers,
        });

        // then
        const { status } = response;

        expect(status).toBe(HttpStatus.BAD_REQUEST);

        const body = (await response.json()) as MessageType;
        const messages = body.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test.concurrent(
        'Neuer Veranstalter, aber Name existiert bereits',
        async () => {
            // given
            const headers = new Headers();
            headers.append(CONTENT_TYPE, APPLICATION_JSON);
            headers.append(AUTHORIZATION, `${BEARER} ${token}`);

            // when
            const response = await fetch(restURL, {
                method: POST,
                body: JSON.stringify(veranstalterNameExistiert),
                headers,
            });

            // then
            const { status } = response;

            expect(status).toBe(HttpStatus.UNPROCESSABLE_ENTITY);

            const body = (await response.json()) as MessageType;

            expect(body.message).toStrictEqual(expect.stringContaining('Name'));
        },
    );

    test.concurrent('Neuer Veranstalter, aber ohne Token', async () => {
        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerVeranstalter),
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent('Neuer Veranstalter, aber mit falschem Token', async () => {
        // given
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(restURL, {
            method: POST,
            body: JSON.stringify(neuerVeranstalter),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test.concurrent.todo('Abgelaufener Token');
});
