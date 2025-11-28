// Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus Typdefinitionen für die Suche in `VeranstalterService`.
 * @packageDocumentation
 */

// Typdefinition für `find` passend zum Veranstalter-Schema
export type Suchparameter = {
    readonly id?: number;
    readonly name?: string;
    readonly email?: string;
    readonly aktiv?: boolean | string;
    readonly ort?: string;
    readonly land?: string;
    readonly plz?: string;
    readonly telefon?: string;
    readonly javascript?: string;
    readonly typescript?: string;
    readonly java?: string;
    readonly python?: string;
    readonly kategorien?: string[];
    readonly art?: 'ONLINE' | 'PR_SENZ' | 'HYBRID' | string;
};

// gueltige Namen fuer die Suchparameter (für Validierung oder Mapping)
export const suchparameterNamen = [
    'id',
    'name',
    'email',
    'aktiv',
    'ort',
    'land',
    'plz',
    'telefon',
    'kategorien',
    'art',
];
