import { redirect } from 'next/navigation';
import { DEFAULT_LOCALE } from '@/lib/locale';

const RootPage = () => {
  redirect(`/${DEFAULT_LOCALE}`);
};

export default RootPage;
