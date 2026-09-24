import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';

import { Public } from '../common/decorators/index.js';
import { MessageResponseDto } from '../common/dto/index.js';
import type { RequestWithUser } from '../common/interfaces/index.js';
import { AuthService } from './auth.service.js';
import {
  ChangePasswordDto,
  LoginDto,
  LoginResponseDto,
  RegisterRecipientDto,
  RegisterRetailerDto,
} from './dto/index.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Registers a retailer and its first login, then signs it in.
   * @param registerRetailerDto The account, the company and the person's name.
   * @returns A Promise that resolves with an access token as LoginResponseDto.
   * @throws ConflictException If the email or tax ID is already registered.
   */
  @Post('register/retailer')
  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @ApiOperation({ summary: 'Register a retailer' })
  @ApiBody({
    type: RegisterRetailerDto,
    description: 'The company, the first account, and who is registering.',
  })
  @ApiCreatedResponse({
    description:
      'Registered and signed in. The organization starts unverified, which is a badge rather than a restriction.',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({ description: 'A field failed validation.' })
  @ApiConflictResponse({
    description: 'The email or the tax ID is already registered.',
  })
  async registerRetailer(
    @Body() registerRetailerDto: RegisterRetailerDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.registerRetailer(registerRetailerDto);
  }

  /**
   * Registers an NGO or foodbank and its first login, then signs it in.
   * @param registerRecipientDto The account, the organization and the person's name.
   * @returns A Promise that resolves with an access token as LoginResponseDto.
   * @throws ConflictException If the email, tax ID or registration code is taken.
   */
  @Post('register/recipient')
  @Public()
  @Throttle({ default: { ttl: 3_600_000, limit: 5 } })
  @ApiOperation({ summary: 'Register an NGO or foodbank' })
  @ApiBody({
    type: RegisterRecipientDto,
    description: 'The organization, the first account, and who is registering.',
  })
  @ApiCreatedResponse({
    description:
      'Registered and signed in. The organization starts unverified, which is a badge rather than a restriction.',
    type: LoginResponseDto,
  })
  @ApiBadRequestResponse({ description: 'A field failed validation.' })
  @ApiConflictResponse({
    description:
      'The email, tax ID or registration code is already registered.',
  })
  async registerRecipient(
    @Body() registerRecipientDto: RegisterRecipientDto,
  ): Promise<LoginResponseDto> {
    return await this.authService.registerRecipient(registerRecipientDto);
  }

  /**
   * Signs in with an email and password.
   * @param loginDto The credentials to check.
   * @returns A Promise that resolves with the access token as LoginResponseDto.
   * @throws UnauthorizedException If the credentials are invalid.
   */
  @Post('login')
  @Public()
  @Throttle({ default: { ttl: 60_000, limit: 10 } })
  @ApiOperation({ summary: 'Sign in' })
  @ApiBody({ type: LoginDto, description: 'Credentials to sign in with.' })
  @ApiCreatedResponse({
    description: 'Signed in successfully.',
    type: LoginResponseDto,
  })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials.' })
  async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
    return await this.authService.login(loginDto);
  }

  /**
   * Signs out by revoking the access token used for this request.
   * @param req The authenticated request, carrying the caller and their token.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Sign out',
    description:
      "Adds this request's token to the denylist, so it stops working immediately rather than at its natural expiry.",
  })
  @ApiOkResponse({
    description: 'Signed out successfully.',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description: 'Missing, invalid or revoked token.',
  })
  async logout(@Req() req: RequestWithUser): Promise<MessageResponseDto> {
    return await this.authService.logout(req.user);
  }

  /**
   * Changes the caller's own password.
   * @param req The authenticated request, carrying the caller and their token.
   * @param changePasswordDto The current and the new password.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws UnauthorizedException If the current password is wrong, or the new
   * password matches the current one.
   */
  @Patch('change-password')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Change your password',
    description:
      'Revokes the token used for this request, so a new sign-in is required afterwards.',
  })
  @ApiBody({
    type: ChangePasswordDto,
    description: 'The current and the new password.',
  })
  @ApiOkResponse({
    description: 'Password updated successfully.',
    type: MessageResponseDto,
  })
  @ApiUnauthorizedResponse({
    description:
      'Missing or invalid token, wrong current password, or the new password matches the current one.',
  })
  async changePassword(
    @Req() req: RequestWithUser,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<MessageResponseDto> {
    return await this.authService.changePassword(req.user, changePasswordDto);
  }
}
