// src/veranstalter/controller/veranstalter-dto.ts
import { Type } from 'class-transformer';
import {
    ArrayUnique,
    IsArray,
    IsBoolean,
    IsEmail,
    IsOptional,
    IsString,
    Matches,
    ValidateNested,
} from 'class-validator';

export const MAX_BEWERTUNG = 5;

export class StandortDTO {
    @IsString()
    strasse!: string;

    @IsString()
    plz!: string;

    @IsString()
    ort!: string;

    @IsOptional()
    @IsString()
    land?: string;
}

export class TeilnehmerDTO {
    @IsString()
    vorname!: string;

    @IsString()
    nachname!: string;

    @IsEmail()
    email!: string;
}

export class VeranstalterDtoOhneRef {
    @IsString()
    name!: string;

    @IsOptional()
    @IsString()
    ort?: string;

    @IsOptional()
    @IsString()
    land?: string;

    @IsOptional()
    @Matches(/^\d{4,5}$/u)
    plz?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @Matches(/^\+?[0-9\s/()-]{5,}$/u)
    telefon?: string;

    @IsOptional()
    art?: string;

    @IsOptional()
    @IsBoolean()
    aktiv?: boolean;

    @IsOptional()
    @ArrayUnique()
    @IsArray()
    schlagwoerter?: string[];
}

export class VeranstalterDTO extends VeranstalterDtoOhneRef {
    @ValidateNested()
    @Type(() => StandortDTO)
    standort!: StandortDTO;

    @IsOptional()
    @ValidateNested({ each: true })
    @Type(() => TeilnehmerDTO)
    teilnehmer?: TeilnehmerDTO[];

    @IsOptional()
    dokumente?: any[];
}
