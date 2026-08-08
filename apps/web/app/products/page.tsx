import Link from 'next/link';
import { apiFetch } from '../lib/api';

type Product = {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  updatedAt: string;
};

export default async function ProductsPage() {
  const { data: products } = await apiFetch<{ data: Product[] }>('/api/v1/products');

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="mb-6 text-xl font-semibold">Productos</h1>
      {products.length === 0 ? (
        <p className="text-sm text-neutral-500">Todavía no hay productos registrados.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {products.map((product) => (
            <li key={product.id}>
              <Link
                href={`/products/${product.id}`}
                className="block rounded border border-neutral-200 px-4 py-3 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900"
              >
                <span className="font-medium">{product.name}</span>
                {product.sku ? <span className="ml-2 text-sm text-neutral-500">{product.sku}</span> : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
