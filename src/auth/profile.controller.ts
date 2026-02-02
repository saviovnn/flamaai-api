import {
  Body,
  Controller,
  Post,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { UpdateProfileImageDto } from './dto/update-profile-image.dto';

@Controller('api/user')
export class UserProfileController {
  constructor(private readonly authService: AuthService) {}

  @Post('profile-image')
  async updateProfileImage(@Body() body: UpdateProfileImageDto) {
    if (!body.userId) {
      throw new HttpException(
        { error: 'userId é obrigatório' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.authService.updateProfileImage(
      body.userId,
      body.image,
    );
    if ('error' in result) {
      throw new HttpException(
        { error: result.error },
        result.error === 'Usuário não encontrado'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }

  @Post('profile-image/clear')
  async clearProfileImage(@Body() body: { userId: string }) {
    if (!body?.userId) {
      throw new HttpException(
        { error: 'userId é obrigatório' },
        HttpStatus.BAD_REQUEST,
      );
    }
    const result = await this.authService.updateProfileImage(body.userId, null);
    if ('error' in result) {
      throw new HttpException(
        { error: result.error },
        result.error === 'Usuário não encontrado'
          ? HttpStatus.NOT_FOUND
          : HttpStatus.BAD_REQUEST,
      );
    }
    return result;
  }
}
