import { IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsString({ message: 'رمز التحديث مطلوب.' })
  refreshToken!: string;
}
