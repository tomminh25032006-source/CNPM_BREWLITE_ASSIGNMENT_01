import { OrderStatus, Size } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsInt()
  @Min(1)
  productId: number;

  @IsEnum(Size, { message: 'Size phải là S, M hoặc L' })
  size: Size;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(5, { message: 'Tối đa 5 topping cho mỗi ly' })
  @ArrayUnique()
  @IsInt({ each: true })
  toppingIds: number[] = [];

  @IsInt()
  @Min(1, { message: 'Số lượng tối thiểu là 1' })
  @Max(20, { message: 'Số lượng tối đa 20 ly cho mỗi món' })
  qty: number;
}

export class CreateOrderDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'Giỏ hàng đang trống' })
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  @MaxLength(30)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  note?: string;
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status: OrderStatus;
}
