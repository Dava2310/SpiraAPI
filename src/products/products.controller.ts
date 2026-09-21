import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import { MessageResponseDto } from '../common/dto/index.js';
import {
  CreateProductDto,
  ProductCreatedResponseDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto/index.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@ApiBearerAuth()
@ApiUnauthorizedResponse({ description: 'Missing, invalid or revoked token.' })
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  /**
   * Retrieves every product, each mapped to a ProductResponseDto.
   * @returns A Promise that resolves with an array of ProductResponseDto.
   */
  @Get()
  @ApiOperation({ summary: 'Get all products' })
  @ApiOkResponse({
    description: 'List of all products.',
    type: [ProductResponseDto],
  })
  async findAll(): Promise<ProductResponseDto[]> {
    return await this.productsService.findAll();
  }

  /**
   * Retrieves every product belonging to one retailer.
   * @param retailerId The ID of the owning retailer.
   * @returns A Promise that resolves with an array of ProductResponseDto.
   */
  @Get('by-retailer/:retailerId')
  @ApiOperation({ summary: "Get one retailer's products" })
  @ApiParam({ name: 'retailerId', description: 'Retailer ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'List of products.',
    type: [ProductResponseDto],
  })
  async findAllByRetailer(
    @Param('retailerId', ParseUUIDPipe) retailerId: string,
  ): Promise<ProductResponseDto[]> {
    return await this.productsService.findAllByRetailer(retailerId);
  }

  /**
   * Retrieves a product by its ID.
   * @param id The ID of the product to look up.
   * @returns A Promise that resolves with the product found as ProductResponseDto.
   * @throws NotFoundException If the product is not found.
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get a single product' })
  @ApiParam({ name: 'id', description: 'Product ID', format: 'uuid' })
  @ApiOkResponse({ description: 'Product found.', type: ProductResponseDto })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ProductResponseDto> {
    return await this.productsService.findOne(id);
  }

  /**
   * Creates a product.
   * @param createProductDto The data to create the product with.
   * @returns A Promise that resolves with the created product as ProductCreatedResponseDto.
   * @throws BadRequestException If the barcode is already used by this retailer.
   */
  @Post()
  @ApiOperation({ summary: 'Create a new product' })
  @ApiBody({
    type: CreateProductDto,
    description: 'Data to create a new product.',
  })
  @ApiCreatedResponse({
    description: 'The product has been created successfully.',
    type: ProductCreatedResponseDto,
  })
  @ApiBadRequestResponse({
    description: 'Invalid data — the barcode is already used by this retailer.',
  })
  async create(
    @Body() createProductDto: CreateProductDto,
  ): Promise<ProductCreatedResponseDto> {
    return await this.productsService.create(createProductDto);
  }

  /**
   * Updates a product found by its ID.
   * @param id The ID of the product to update.
   * @param updateProductDto The new data for the product.
   * @returns A Promise that resolves with the updated product as ProductCreatedResponseDto.
   * @throws NotFoundException If the product is not found.
   * @throws BadRequestException If the barcode is used by another product of the same retailer.
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update a product' })
  @ApiParam({
    name: 'id',
    description: 'ID of the product to update',
    format: 'uuid',
  })
  @ApiBody({ type: UpdateProductDto, description: 'New data for the product.' })
  @ApiOkResponse({
    description: 'Product updated successfully.',
    type: ProductCreatedResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  @ApiBadRequestResponse({
    description: 'Invalid data — the barcode is already used by this retailer.',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateProductDto: UpdateProductDto,
  ): Promise<ProductCreatedResponseDto> {
    return await this.productsService.update(id, updateProductDto);
  }

  /**
   * Soft-deletes a product, freeing its barcode and preserving already-logged stock lots.
   * @param id The ID of the product to delete.
   * @returns A Promise that resolves with a success message as MessageResponseDto.
   * @throws NotFoundException If the product is not found.
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a product by its ID' })
  @ApiParam({ name: 'id', description: 'Product ID', format: 'uuid' })
  @ApiOkResponse({
    description: 'Product deleted successfully.',
    type: MessageResponseDto,
  })
  @ApiNotFoundResponse({ description: 'Product not found.' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    return await this.productsService.remove(id);
  }
}
