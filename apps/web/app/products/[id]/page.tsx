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
        <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
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
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link href="/products" className="text-sm text-neutral-500 underline">
        Productos
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
        <section>
          <div className="mb-6">
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Expediente de producto</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{product.name}</h1>
            <div className="mt-2 flex flex-wrap gap-2 text-sm text-neutral-500">
              {product.sku ? <span>SKU {product.sku}</span> : <span>Sin SKU registrado</span>}
              {latestVersion ? <span>Version {latestVersion.version}</span> : null}
            </div>
          </div>

          {latestVersion ? (
            <div className="grid gap-6">
              <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
                <h2 className="text-base font-semibold">Descripcion tecnica</h2>
                <p className="mt-3 text-sm leading-6 text-neutral-700 dark:text-neutral-300">{latestVersion.description}</p>
              </section>

              <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
                <div className="mb-4 flex flex-col gap-1">
                  <h2 className="text-base font-semibold">Evidencia</h2>
                  <p className="text-sm text-neutral-500">Sube documentos que respalden composicion, funcion, origen, uso y presentacion comercial.</p>
                </div>
                <EvidenceUploader productVersionId={latestVersion.id} initialDocuments={[]} />
              </section>

              <section className="rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
                <div className="mb-4 flex flex-col gap-1">
                  <h2 className="text-base font-semibold">Clasificacion arancelaria</h2>
                  <p className="text-sm text-neutral-500">Crea el caso cuando la descripcion y la evidencia minima esten listas para analisis.</p>
                </div>
                <StartCaseButton productId={product.id} />
              </section>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-neutral-300 p-8 dark:border-neutral-700">
              <h2 className="font-semibold">Este producto no tiene versiones</h2>
              <p className="mt-2 text-sm text-neutral-500">Crea una version tecnica antes de abrir un caso de clasificacion.</p>
            </div>
          )}
        </section>

        <aside className="h-fit rounded-lg border border-neutral-200 p-5 dark:border-neutral-800">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Siguiente trabajo</h2>
          <ol className="mt-4 space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-950">1</span>
              <div>
                <p className="font-medium">Completar descripcion</p>
                <p className="mt-1 text-neutral-500">Incluye material, funcion, uso y presentacion.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-950">2</span>
              <div>
                <p className="font-medium">Adjuntar evidencia</p>
                <p className="mt-1 text-neutral-500">Ficha tecnica, factura, imagenes o certificaciones.</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-semibold text-white dark:bg-white dark:text-neutral-950">3</span>
              <div>
                <p className="font-medium">Abrir clasificacion</p>
                <p className="mt-1 text-neutral-500">El caso concentra candidatos, revision y expediente PDF.</p>
              </div>
            </li>
          </ol>
        </aside>
      </div>
    </main>
  );
}
