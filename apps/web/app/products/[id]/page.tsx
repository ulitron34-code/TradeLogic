import Link from 'next/link';
import { apiFetch, ApiError } from '../../lib/api';
import { EvidenceUploader } from './evidence-uploader';
import { StartCaseButton } from './start-case-button';

type ProductVersion = {
  id: string;
  version: number;
  description: string;
};

type Product = {
  id: string;
  name: string;
  sku: string | null;
  versions: ProductVersion[];
};

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let product: Product;
  try {
    product = await apiFetch<Product>(`/api/v1/products/${id}`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <main className="mx-auto max-w-2xl px-4 py-10">
          <p className="text-sm text-neutral-500">Producto no encontrado.</p>
          <Link href="/products" className="mt-4 inline-block text-sm underline">
            Volver a productos
          </Link>
        </main>
      );
    }
    throw error;
  }

  const latestVersion = product.versions[0];

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href="/products" className="text-sm text-neutral-500 underline">
        Productos
      </Link>
      <h1 className="mt-2 mb-1 text-xl font-semibold">{product.name}</h1>
      {product.sku ? <p className="mb-6 text-sm text-neutral-500">{product.sku}</p> : null}

      {latestVersion ? (
        <>
          <p className="mb-4 text-sm text-neutral-700 dark:text-neutral-300">{latestVersion.description}</p>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-neutral-500">Evidencia</h2>
          <EvidenceUploader productVersionId={latestVersion.id} initialDocuments={[]} />

          <h2 className="mb-3 mt-8 text-sm font-medium uppercase tracking-wide text-neutral-500">
            Clasificacion arancelaria
          </h2>
          <StartCaseButton productId={product.id} />
        </>
      ) : (
        <p className="text-sm text-neutral-500">Este producto no tiene versiones.</p>
      )}
    </main>
  );
}
