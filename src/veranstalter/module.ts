// Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import { Module } from '@nestjs/common';
import { MailModule } from '../mail/module.js';
import { KeycloakModule } from '../security/keycloak/module.js';
import { VeranstalterController } from './controller/veranstalter-controller.js';
import { VeranstalterWriteController } from './controller/veranstalter-write-controller.js';
import { VeranstalterMutationResolver } from './resolver/mutation.js';
import { VeranstalterQueryResolver } from './resolver/query.js';
import { PrismaService } from './service/prisma-service.js';
import { VeranstalterService } from './service/veranstalter-service.js';
import { VeranstalterWriteService } from './service/veranstalter-write-service.js';
import { WhereBuilder } from './service/where-builder.js';

/**
 * Das Modul besteht aus Controller- und Service-Klassen für die Verwaltung von
 * Bücher.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit Controller- und Service-Klassen sowie der
 * Funktionalität für Prisma.
 */
@Module({
    imports: [KeycloakModule, MailModule],
    controllers: [VeranstalterController, VeranstalterWriteController],
    // Provider sind z.B. Service-Klassen fuer DI
    providers: [
        VeranstalterService,
        VeranstalterWriteService,
        VeranstalterQueryResolver,
        VeranstalterMutationResolver,
        PrismaService,
        WhereBuilder,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [VeranstalterService, VeranstalterWriteService],
})
export class VeranstalterModule {}
