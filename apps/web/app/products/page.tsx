import Link from 'next/link';
import { apiFetch } from '../lib/api';
import { CreateProductForm } from './create-product-form';

type Product = {
  id: string;
  name: string;
  sku: string | null;
  status: string;
  updatedAt: string;
};

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Activo',
  INACTIVE: 'Inactivo',
  ARCHIVED: 'Archivado',
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(new Date(value));
}

export default async function ProductsPage() {
  try {
    const { data: products } = await apiFetch<{ data: Product[] }>('/api/v1/products');
    const activeProducts = products.filter((product) => product.status !== 'ARCHIVED').length;

    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Catalogo operativo</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">Productos</h1>
            <p className="mt-2 max-w-2xl text-sm text-neutral-600 dark:text-neutral-400">
              Registra mercancias, conserva su evidencia tecnica y abre casos de clasificacion desde el detalle de cada producto.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm sm:min-w-64">
            <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="text-neutral-500">Total</p>
              <p className="mt-1 text-2xl font-semibold">{products.length}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 px-4 py-3 dark:border-neutral-800">
              <p className="text-neutral-500">Activos</p>
              <p className="mt-1 text-2xl font-semibold">{activeProducts}</p>
            </div>
          </div>
        </div>

        <section className="mb-8 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
          <CreateProductForm />
        </section>

        {products.length === 0 ? (
          <section className="rounded-lg border border-dashed border-neutral-300 p-8 dark:border-neutral-700">
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold">Crea el primer producto para iniciar el flujo</h2>
              <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">
                Despues de guardarlo podras subir ficha tecnica, factura, imagenes o documentos de soporte, y abrir el expediente de clasificacion.
              </p>
            </div>
          </section>
        ) : (
          <section className="grid gap-3">
            {products.map((product) => (
              <Link
                key={product.id}
                href={`/products/${product.id}`}
                className="group rounded-lg border border-neutral-200 bg-white px-4 py-4 transition hover:border-blue-300 hover:shadow-sm dark:border-neutral-800 dark:bg-neutral-950"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{product.name}</h2>
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                        {STATUS_LABEL[product.status] ?? product.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500">
                      {product.sku ? `SKU ${product.sku}` : 'Sin SKU'} · Actualizado {formatDate(product.updatedAt)}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-blue-700 group-hover:text-blue-800 dark:text-blue-300">
                    Abrir expediente
                  </span>
                </div>
              </Link>
            ))}
          </section>
        )}
      </main>
    );
  } catch {
    return (
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">Productos</h1>
        <div className="mt-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <p className="font-medium">La API todavía no está disponible.</p>
          <p className="mt-1">El servicio puede estar despertando o tener un problema temporal de base de datos. Intenta recargar en unos segundos.</p>
        </div>
      </main>
    );
  }
}
