import { IsEmail, IsString, MinLength } from "class-validator";

export class LoginDto {
  @IsEmail({}, { message: "البريد الإلكتروني المدخل غير صالح." })
  email!: string;

  @IsString()
  @MinLength(6, { message: "يجب أن لا تقل كلمة المرور عن 6 أحرف." })
  password!: string;
}
