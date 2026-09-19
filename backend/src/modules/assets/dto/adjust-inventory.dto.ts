import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import { InventoryChangeType } from "../models/inventory-history.model";

export class AdjustInventoryDto {
  @IsEnum(InventoryChangeType)
  changeType!: InventoryChangeType;

  // Always a positive magnitude — the service derives the sign from
  // changeType (and, for ADJUSTMENT, from `direction` below).
  @IsInt()
  @Min(1)
  quantity!: number;

  // Only required when changeType is ADJUSTMENT, since a manual stock
  // correction can go either way. Ignored for every other changeType.
  @IsOptional()
  @IsIn(["increase", "decrease"])
  direction?: "increase" | "decrease";

  @IsOptional()
  @IsString()
  reason?: string;
}
