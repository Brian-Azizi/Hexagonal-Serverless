import { AbstractProductRepository } from "../src/adapters/repository";
import { Product } from "../src/domain/model";

export class FakeProductRepository implements AbstractProductRepository {
  private readonly products: { [sku: string]: Product } = {};

  public add(product: Product): void | Promise<void> {
    this.products[product.sku] = product;
  }

  public get(sku: string): Product | Promise<Product> {
    return this.products[sku];
  }
}
