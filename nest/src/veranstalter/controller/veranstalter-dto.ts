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
 * Das Modul besteht aus der Entity-Klasse für Veranstalter.
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file, @typescript-eslint/no-magic-numbers */

import { ApiProperty } from '@nestjs/swagger';
import BigNumber from 'bignumber.js';
import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsEmail,
    IsISO8601,
    IsInt,
    IsOptional,
    IsString,
    IsUrl,
    Matches,
    Max,
    Min,
    ValidateNested,
    type ValidationArguments,
    ValidatorConstraint,
    type ValidatorConstraintInterface,
} from 'class-validator';
import { AdresseDTO } from './adresse-dto.js';
import { DokumentDTO } from './dokument-dto.js';

export const MAX_BEWERTUNG = 5;

// Transformationshelfer
const number2Decimal = ({ value }: { value: BigNumber.Value | undefined }) => {
    if (value === undefined) {
        return;
    }
    BigNumber.set({ DECIMAL_PLACES: 6 });
    return BigNumber(value);
};

// Beispiel für Prozentfelder (optional)
const number2Percent = ({ value }: { value: BigNumber.Value | undefined }) => {
    if (value === undefined) {
        return;
    }
    BigNumber.set({ DECIMAL_PLACES: 4 });
    return BigNumber(value);
};

// Custom Validation Classes
@ValidatorConstraint({ name: 'decimalMin', async: false })
class DecimalMin implements ValidatorConstraintInterface {
    validate(value: BigNumber | undefined, args: ValidationArguments) {
        if (value === undefined) return true;
        const [minValue]: BigNumber[] = args.constraints;
        return value.isGreaterThan(minValue!);
    }

    defaultMessage(args: ValidationArguments) {
        return `Der Wert muss groesser oder gleich ${(args.constraints[0] as BigNumber).toNumber()} sein.`;
    }
}

@ValidatorConstraint({ name: 'decimalMax', async: false })
class DecimalMax implements ValidatorConstraintInterface {
    validate(value: BigNumber | undefined, args: ValidationArguments) {
        if (value === undefined) return true;
        const [maxValue]: BigNumber[] = args.constraints;
        return value.isLessThan(maxValue!);
    }

    defaultMessage(args: ValidationArguments) {
        return `Der Wert muss kleiner oder gleich ${(args.constraints[0] as BigNumber).toNumber()} sein.`;
    }
}

/**
 * Entity-Klasse für Veranstalter ohne Referenzen.
 */
export class VeranstalterDtoOhneRef {
    @IsString()
    @ApiProperty({ example: 'Kulturzentrum Karlsruhe', type: String })
    readonly name!: string;

    @IsOptional()
    @IsString()
    @ApiProperty({ example: 'Karlsruhe', type: String })
    readonly ort: string | undefined;

    @IsOptional()
    @IsString()
    @ApiProperty({ example: 'Deutschland', type: String })
    readonly land: string | undefined;

    @IsOptional()
    @Matches(/^\d{4,5}$/u)
    @ApiProperty({ example: '76133', type: String })
    readonly plz: string | undefined;

    @IsOptional()
    @IsEmail()
    @ApiProperty({ example: 'info@kulturzentrum.de', type: String })
    readonly email: string | undefined;

    @IsOptional()
    @Matches(/^\+?[0-9\s/()-]{5,}$/u)
    @ApiProperty({ example: '+49 721 1234567', type: String })
    readonly telefon: string | undefined;

    @IsOptional()
    @IsUrl()
    @ApiProperty({ example: 'https://kulturzentrum.de', type: String })
    readonly homepage: string | undefined;

    @IsOptional()
    @IsISO8601({ strict: true })
    @ApiProperty({ example: '2024-05-01', description: 'Gründungsdatum' })
    readonly gruendungsdatum: string | Date | undefined;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(MAX_BEWERTUNG)
    @ApiProperty({ example: 4, description: 'Bewertung des Veranstalters' })
    readonly bewertung: number | undefined;

    @IsOptional()
    @IsBoolean()
    @ApiProperty({ example: true, description: 'Ist der Veranstalter aktiv?' })
    readonly aktiv: boolean | undefined;

    @IsOptional()
    @ArrayUnique()
    @ApiProperty({
        example: ['Musik', 'Kunst', 'Theater'],
        description: 'Kategorien oder Schlagwörter des Veranstalters',
    })
    readonly kategorien: string[] | undefined;
}

/**
 * Entity-Klasse für Veranstalter mit Referenzen.
 */
export class VeranstalterDTO extends VeranstalterDtoOhneRef {
    @ValidateNested()
    @Type(() => AdresseDTO)
    @ApiProperty({ type: AdresseDTO })
    readonly adresse!: AdresseDTO;

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => DokumentDTO)
    @ApiProperty({ type: [DokumentDTO] })
    readonly dokumente: DokumentDTO[] | undefined;
}
/* eslint-enable max-classes-per-file, @typescript-eslint/no-magic-numbers */
