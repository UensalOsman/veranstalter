// tests/rest/veranstalter/GET-queryparam.test.ts
import { HttpStatus } from '@nestjs/common';
import { describe, expect, test } from 'vitest';
import { Veranstalter } from '../../../src/generated/prisma/client.js';
import { type Page } from '../../../src/veranstalter/controller/page.js';
import { CONTENT_TYPE, restURL } from '../constants.mjs';

// -----------------------------------------------------------------------------
// Testdaten basierend auf deinem Schema & CSV
// -----------------------------------------------------------------------------
const nameArray = [
    'ACME GmbH',
    'TechCorp AG',
    'Innovate Ltd',
    'FutureWorks',
    'NextGen GmbH',
    'CodeLabs',
    'DataVision',
    'Softline',
    'BrightTech',
];
const nameNichtVorhanden = ['FooBar', 'NonExistent', 'Ghost'];
const ids = [1, 20, 30, 40, 50, 60, 70, 80, 90];
const artArray = ['ONLINE', 'PR_SENZ', 'HYBRID'];

// -----------------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------------
describe('GET /rest', () => {
    // Alle Veranstalter
    test.concurrent('Alle Veranstalter', async () => {
        const response = await fetch(restURL);
        const { status, headers } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers.get(CONTENT_TYPE)).toMatch(/json/iu);

        const body = (await response.json()) as Page<Veranstalter>;

        body.content.forEach((v) => {
            expect(v).toBeDefined();
            expect(v.id).toBeDefined();
            expect(v.name).toBeDefined();
        });
    });

    // -------------------------------------------------------------------------
    // Suche nach Teil-Name
    // -------------------------------------------------------------------------
    test.concurrent.each(nameArray)(
        'Veranstalter mit Teil-Name %s',
        async (name) => {
            const url = `${restURL}?name=${encodeURIComponent(name)}`;
            const response = await fetch(url);

            expect(response.status).toBe(HttpStatus.OK);

            const body = (await response.json()) as Page<Veranstalter>;

            expect(body.content.length).toBeGreaterThan(0);

            body.content.forEach((v) => {
                expect(v).toBeDefined();
                expect(v.name?.toLowerCase()).toContain(name.toLowerCase());
            });
        },
    );

    test.concurrent.each(nameNichtVorhanden)(
        'Keine Veranstalter zu Teil-Name %s',
        async (name) => {
            const url = `${restURL}?name=${encodeURIComponent(name)}`;
            const response = await fetch(url);

            expect(response.status).toBe(HttpStatus.NOT_FOUND);
        },
    );

    // -------------------------------------------------------------------------
    // Suche nach ID
    // -------------------------------------------------------------------------
    test.concurrent.each(ids)('Veranstalter mit ID %i', async (id) => {
        const url = `${restURL}?id=${id}`;
        const response = await fetch(url);

        expect(response.status).toBe(HttpStatus.OK);

        const body = (await response.json()) as Page<Veranstalter>;

        expect(body.content).toHaveLength(1);

        const v = body.content[0];

        expect(v).toBeDefined();
        expect(v?.id).toBe(id);
    });

    // -------------------------------------------------------------------------
    // Suche nach Art
    // -------------------------------------------------------------------------
    test.concurrent.each(artArray)('Veranstalter zur Art %s', async (art) => {
        const url = `${restURL}?art=${encodeURIComponent(art)}`;
        const response = await fetch(url);

        expect(response.status).toBe(HttpStatus.OK);

        const body = (await response.json()) as Page<Veranstalter>;

        expect(body.content.length).toBeGreaterThan(0);

        body.content.forEach((v) => {
            expect(v).toBeDefined();
            expect(v.art).toBe(art);
        });
    });

    // -------------------------------------------------------------------------
    // Nicht vorhandene Property
    // -------------------------------------------------------------------------
    test.concurrent(
        'Keine Veranstalter zu nicht-vorhandener Property',
        async () => {
            const url = `${restURL}?foo=bar`;
            const response = await fetch(url);

            expect(response.status).toBe(HttpStatus.NOT_FOUND);
        },
    );
});
