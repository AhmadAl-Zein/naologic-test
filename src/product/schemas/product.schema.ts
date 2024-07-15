import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface Image {
  fileName: string;
  cdnLink: string;
  i: number;
  alt: string;
}

export interface Variant {
  id: string;
  available: boolean;
  attributes: Attributes;
  cost: number;
  currency: string;
  depth: number;
  description: string;
  dimensionUom: number;
  height: number;
  width: number;
  manufacturerItemCode: string;
  manufacturerItemId: string;
  packaging: string;
  price: number;
  volume: number;
  volumeUom: number;
  weight: number;
  weightUom: number;
  optionName: string;
  optionsPath: string;
  optionItemsPath: string;
  sku: string;
  active: boolean;
  images: Image[];
  itemCode: string;
}

export interface Option {
  id: string;
  name: string;
  dataField: string;
}

export interface Attributes {
  packaging: string;
  description: string;
}

@Schema({ timestamps: true })
export class Product extends Document {
  @Prop({ required: false })
  name?: string;

  @Prop({ required: false })
  type: string;

  @Prop({ required: false })
  shortDescription: string;

  @Prop({ required: false })
  description: string;

  @Prop({ required: false })
  vendorId: string;

  @Prop({ required: false })
  manufacturerId: string;

  @Prop({ required: false })
  storefrontPriceVisibility: string;

  @Prop({ required: false })
  availability: string;

  @Prop({ required: false })
  isFragile: boolean;

  @Prop({ required: false })
  published: string;

  @Prop({ required: false })
  isTaxable: boolean;

  @Prop({ required: false })
  options: Option[];

  @Prop({ required: false })
  variants: Variant[];

  @Prop({ required: false })
  images: Image[];
}

export const ProductSchema = SchemaFactory.createForClass(Product);
