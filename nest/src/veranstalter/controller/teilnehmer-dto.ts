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

/**
 * Das Modul besteht aus der Entity-Klasse.
 * @packageDocumentation
 */

/* eslint-disable @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';
import { MaxLength, IsOptional, IsUrl } from 'class-validator';

/**
 * Entity-Klasse für Standortdaten eines Teilnehmers.
 */
export class StandortDTO {
    @MaxLength(64)
    @ApiProperty({ example: 'Karlsruhe', type: String })
    readonly standort!: string;

    @IsOptional()
    @MaxLength(128)
    @ApiProperty({
        example: 'Hauptstandort der Schulung oder des Unternehmens',
        type: String,
        required: false,
    })
    readonly beschreibung?: string;

    @IsOptional()
    @MaxLength(64)
    @ApiProperty({
        example: 'Gebäude B, Raum 203',
        type: String,
        required: false,
    })
    readonly adresse?: string;

    @IsOptional()
    @IsUrl()
    @ApiProperty({
        example: 'https://maps.google.com/?q=Karlsruhe',
        type: String,
        required: false,
    })
    readonly karteUrl?: string;

    @IsOptional()
    @MaxLength(32)
    @ApiProperty({
        example: 'image/png',
        type: String,
        required: false,
        description: 'Optionaler MIME-Typ für ein Standortbild oder Logo',
    })
    readonly contentType?: string;
}
/* eslint-enable @typescript-eslint/no-magic-numbers */
