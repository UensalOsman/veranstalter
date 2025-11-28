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
import {
    APPLICATION_JSON,
    AUTHORIZATION,
    BEARER,
    CONTENT_TYPE,
    IF_MATCH,
    PUT,
    restURL,
} from '../constants.mjs';
import { getToken } from '../token.mjs';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaenderterVeranstalter = {
    name: 'Updated Event Company',
    email: 'updated@eventx.de',
    telefon: '+49 721 9876543',
    art: 'HYBRID',
    aktiv: false,
    standort: {
        strasse: 'Hauptstrasse 99',
        plz: '76131',
        ort: 'Karlsruhe',
        land: 'Deutschland',
    },
};
const idVorhanden = '1';

const geaenderterVeranstalterIdNichtVorhanden = {
    name: 'NichtVorhanden GmbH',
    email: 'nicht@da.de',
    telefon: '+49 700 000000',
    art: 'ONLINE',
    aktiv: true,
    standort: {
        strasse: 'Fantasiestr. 1',
        plz: '00000',
        ort: 'Nirgendwo',
        land: 'Deutschland',
    },
};
const idNichtVorhanden = '999999';

const geaenderterVeranstalterInvalid: Record<string, unknown> = {
    name: '??',
    email: 'falscheEmail',
    telefon: '',
    art: 'UNGUELTIG',
};

const veralteterVeranstalter = {
    name: 'Old Event GmbH',
    email: 'old@event.de',
    telefon: '+49 721 555555',
    art: 'PRAESENZ',
    aktiv: true,
    standort: {
        strasse: 'Allee 10',
        plz: '76133',
        ort: 'Karlsruhe',
        land: 'Deutschland',
    },
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
// Test-Suite
describe('PUT /rest/:id', () => {
    let token: string;

    beforeAll(async () => {
        token = await getToken('admin', 'p');
    });

    test('Vorhandenen Veranstalter aendern', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterVeranstalter),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.NO_CONTENT);
    });

    test('Nicht-vorhandenen Veranstalter aendern', async () => {
        // given
        const url = `${restURL}/${idNichtVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterVeranstalterIdNichtVorhanden),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.NOT_FOUND);
    });

    test('Vorhandenen Veranstalter aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);
        const expectedMsg = [
            expect.stringMatching(/^email /u),
            expect.stringMatching(/^telefon /u),
        ];

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterVeranstalterInvalid),
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.BAD_REQUEST);

        const body = (await response.json()) as { message: string[] };
        const messages = body.message;

        expect(messages).toBeDefined();
        expect(messages).toHaveLength(expectedMsg.length);
        expect(messages).toStrictEqual(expect.arrayContaining(expectedMsg));
    });

    test('Vorhandenen Veranstalter aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterVeranstalter),
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.PRECONDITION_REQUIRED);

        const body = await response.text();

        expect(body).toBe(`Header "${IF_MATCH}" fehlt`);
    });

    test('Vorhandenen Veranstalter aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"-1"');
        headers.append(AUTHORIZATION, `${BEARER} ${token}`);

        // when
        const response = await fetch(url, {
            method: PUT,
            body: JSON.stringify(veralteterVeranstalter),
            headers,
        });

        // then
        expect(response.status).toBe(HttpStatus.PRECONDITION_FAILED);

        const { message, statusCode } = (await response.json()) as {
            message: string;
            statusCode: number;
        };

        expect(message).toMatch(/Versionsnummer/u);
        expect(statusCode).toBe(HttpStatus.PRECONDITION_FAILED);
    });

    test('Vorhandenen Veranstalter aendern, aber ohne Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterVeranstalter),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });

    test('Vorhandenen Veranstalter aendern, aber mit falschem Token', async () => {
        // given
        const url = `${restURL}/${idVorhanden}`;
        const headers = new Headers();
        headers.append(CONTENT_TYPE, APPLICATION_JSON);
        headers.append(IF_MATCH, '"0"');
        headers.append(AUTHORIZATION, `${BEARER} FALSCHER_TOKEN`);

        // when
        const { status } = await fetch(url, {
            method: PUT,
            body: JSON.stringify(geaenderterVeranstalter),
            headers,
        });

        // then
        expect(status).toBe(HttpStatus.UNAUTHORIZED);
    });
});
