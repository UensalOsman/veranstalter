// Copyright (C) 2025 - present Juergen Zimmermann, Hochschule Karlsruhe
//
// Dieses Modul enthält die DTO-Klasse für Teilnehmer
// @packageDocumentation

import { ApiProperty } from '@nestjs/swagger';
import {
    IsEmail,
    IsOptional,
    IsUrl,
    Matches,
    MaxLength,
} from 'class-validator';
import { StandortDTO } from './standort-dto.js';

/**
 * Entity-Klasse für einen Teilnehmer eines Veranstalters.
 */
export class TeilnehmerDTO {
    @MaxLength(64)
    @ApiProperty({ example: 'Max Mustermann', type: String })
    readonly name!: string;

    @IsOptional()
    @MaxLength(64)
    @ApiProperty({ example: 'Musterfirma GmbH', type: String, required: false })
    readonly firma?: string;

    @IsOptional()
    @IsEmail()
    @ApiProperty({
        example: 'max@mustermann.de',
        type: String,
        required: false,
    })
    readonly email?: string;

    @IsOptional()
    @Matches(/^\+?[0-9\s/()-]{5,}$/u)
    @ApiProperty({ example: '+49 721 1234567', type: String, required: false })
    readonly telefon?: string;

    @IsOptional()
    @IsUrl()
    @ApiProperty({
        example: 'https://linkedin.com/in/maxmustermann',
        type: String,
        required: false,
    })
    readonly profilUrl?: string;

    @IsOptional()
    @ApiProperty({ type: StandortDTO, required: false })
    readonly standort?: StandortDTO;
    vorname: any;
    nachname: any;
}
