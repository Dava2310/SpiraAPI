import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';

import { MessageResponseDto } from '../common/dto/index.js';
import type { CrudRepository } from '../common/use-case/index.js';
import { UUID_PATTERN } from '../common/validation/index.js';
import {
  CreateProductDto,
  ProductCreatedResponseDto,
  ProductResponseDto,
  UpdateProductDto,
} from './dto/index.js';
import { Product } from './entities/product.entity.js';

/**
 * Business logic for the Product catalogue. Implements {@link CrudRepository} so
 * the "find a valid record or throw" contract is the same across modules.
 */
@Injectable()
export class ProductsService implements CrudRepository<Product> {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  /**
   * Finds a Product by its ID. "Valid" means present and not soft-deleted.
   * @param id The ID of the Product to look up.
   * @returns A Promise that resolves with the Product found.
   * @throws NotFoundException If the Product does not exist or is soft-deleted.
   */
  async findValid(id: number | string): Promise<Product> {
    const uuid = String(id);

    if (!UUID_PATTERN.test(uuid)) {
      throw new NotFoundException(`Invalid Product ID: ${id}`);
    }

    const product = await this.productRepository.findOne({
      where: { id: uuid },
    });

    if (!product) {
      throw new NotFoundException(
        `Product with ID: ${id} not found or not valid`,
      );
    }

    return product;
  }

  /**
   * Retrieves every product that is not soft-deleted.
   * @returns A Promise that resolves with all products mapped to ProductResponseDto.
   */
  async findAll(): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
      order: { name: 'ASC' },
    });

    return products.map((product) => new ProductResponseDto(product));
  }

  /**
   * Retrieves a single product by its ID.
   * @param id The ID of the product to look up.
   * @returns A Promise that resolves with the product mapped to ProductResponseDto.
   * @throws NotFoundException If the product is not found.
   */
  async findOne(id: string): Promise<ProductResponseDto> {
    const product = await this.findValid(id);

    return new ProductResponseDto(product);
  }

  /**
   * Retrieves every product in a retailer's catalogue.
   * @param retailerId The ID of the owning retailer.
   * @returns A Promise that resolves with the products mapped to ProductResponseDto.
   */
  async findAllByRetailer(retailerId: string): Promise<ProductResponseDto[]> {
    const products = await this.productRepository.find({
      where: { retailerId },
      order: { name: 'ASC' },
    });

    return products.map((product) => new ProductResponseDto(product));
  }

  /**
   * Finds a product by barcode within one retailer's catalogue.
   * @param retailerId The ID of the owning retailer.
   * @param barcode The barcode to search for.
   * @returns A Promise that resolves with the product found, or null.
   */
  async findOneByBarcode(
    retailerId: string,
    barcode: string,
  ): Promise<Product | null> {
    return await this.productRepository.findOne({
      where: { retailerId, barcode },
    });
  }

  /**
   * Finds a product by barcode within one retailer's catalogue, excluding one
   * product from the search by its ID.
   * @param id The ID of the product to exclude from the search.
   * @param retailerId The ID of the owning retailer.
   * @param barcode The barcode to search for.
   * @returns A Promise that resolves with the product found, or null.
   */
  async findOneByBarcodeNotId(
    id: string,
    retailerId: string,
    barcode: string,
  ): Promise<Product | null> {
    return await this.productRepository.findOne({
      where: { retailerId, barcode, id: Not(id) },
    });
  }

  /**
   * Creates a catalogue product.
   * @param createProductDto The data to create the product with.
   * @returns A Promise that resolves with the created product and a success message.
   * @throws BadRequestException If the barcode is already used by this retailer.
   */
  async create(
    createProductDto: CreateProductDto,
  ): Promise<ProductCreatedResponseDto> {
    const { retailerId, barcode } = createProductDto;

    if (barcode && (await this.findOneByBarcode(retailerId, barcode))) {
      throw new BadRequestException(
        `This retailer already has a product with the barcode: ${barcode}`,
      );
    }

    const product = this.productRepository.create(createProductDto);
    const newProduct = await this.productRepository.save(product);

    return new ProductCreatedResponseDto(
      newProduct,
      'Product created successfully.',
    );
  }

  /**
   * Updates a product found by its ID.
   * @param id The ID of the product to update.
   * @param updateProductDto The new data for the product.
   * @returns A Promise that resolves with the updated product and a success message.
   * @throws NotFoundException If the product is not found.
   * @throws BadRequestException If the barcode is used by another product of the
   * same retailer.
   */
  async update(
    id: string,
    updateProductDto: UpdateProductDto,
  ): Promise<ProductCreatedResponseDto> {
    const product = await this.findValid(id);
    const { barcode } = updateProductDto;

    if (
      barcode &&
      (await this.findOneByBarcodeNotId(
        product.id,
        product.retailerId,
        barcode,
      ))
    ) {
      throw new BadRequestException(
        `Another product of this retailer already uses the barcode: ${barcode}`,
      );
    }

    Object.assign(product, updateProductDto);

    const updatedProduct = await this.productRepository.save(product);

    return new ProductCreatedResponseDto(
      updatedProduct,
      'Product updated successfully.',
    );
  }

  /**
   * Soft-deletes a product, so stock lots already logged against it keep their
   * description and its barcode can be reused.
   * @param id The ID of the product to delete.
   * @returns A Promise that resolves with a success message.
   * @throws NotFoundException If the product is not found.
   */
  async remove(id: string): Promise<MessageResponseDto> {
    const product = await this.findValid(id);

    await this.productRepository.softRemove(product);

    return new MessageResponseDto('Product deleted successfully.');
  }
}
