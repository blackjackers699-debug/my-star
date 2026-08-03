import { IsEmail, IsIn } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsEmail()
  email!: string;

  @IsIn(['vip-monthly'])
  planCode!: 'vip-monthly';
}
