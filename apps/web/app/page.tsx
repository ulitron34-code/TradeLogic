import { redirect } from 'next/navigation';

// El middleware ya exige sesion para llegar aqui; solo decide a donde ir.
export default function Home() {
  redirect('/products');
}
