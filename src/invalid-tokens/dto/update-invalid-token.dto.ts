import { PartialType } from '@nestjs/swagger';

import { CreateInvalidTokenDto } from './create-invalid-token.dto.js';

export class UpdateInvalidTokenDto extends PartialType(CreateInvalidTokenDto) {}
