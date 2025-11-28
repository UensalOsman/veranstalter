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

/* eslint-disable @typescript-eslint/no-magic-numbers */

/**
 * Das Modul besteht aus der Entity-Klasse für Standortdaten.
 * @packageDocumentation
 */

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, Matches, MaxLength } from 'class-validator';

/**
 * Entity-Klasse für Standort eines Teilnehmers oder Veranstalters.
 */
export class StandortDTO {
    @Matches(String.raw`^\w.*`)
    @MaxLength(40)
    @ApiProperty({ example: 'Karlsruhe', type: String })
    readonly ort!: string;

    @IsOptional()
    @Matches(String.raw`^\d{4,5}$`)
    @ApiProperty({ example: '76133', type: String, required: false })
    readonly plz?: string;

    @IsOptional()
    @MaxLength(64)
    @ApiProperty({ example: 'Hauptstraße 12', type: String, required: false })
    readonly strasse?: string;

    @IsOptional()
    @MaxLength(128)
    @ApiProperty({
        example: 'Hauptstandort der Schulung',
        type: String,
        required: false,
    })
    readonly details?: string;
}
