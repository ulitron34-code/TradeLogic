import { redirect } from 'next/navigation';

// El middleware ya exige sesion para llegar aqui; el tablero es la puerta de
// entrada de la plataforma y desde ahi se descubren los modulos disponibles.
export default function Home() {
  redirect('/dashboard');
}
